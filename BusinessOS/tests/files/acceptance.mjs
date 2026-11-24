import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, createSecretKey, randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { setTimeout as wait } from "node:timers/promises";
import { URL } from "node:url";
import { createProtectedApi } from "../../apps/api/dist/create-api.js";
import { withPrivateFiles } from "../../apps/api/dist/files/files.module.js";
import {
  FileRepository, FileService, fileAccess, ScanDispatcher, scanProcessor,
} from "../../packages/file-jobs/dist/index.js";
import { a1, b1, b2 } from "../../packages/database/fixtures/seed.mjs";
import { createFixtures, environment } from "../security/fixtures.mjs";
import { BusinessOSApiClient } from "../../packages/api-client/src/index.ts";

const apiRequire = createRequire(new URL("../../apps/api/package.json", import.meta.url));
const supertest = apiRequire("supertest");
const executor = { kind: "service", id: "scanner-fixture", identityRef: "worker-binding" };
const proofKey = createSecretKey(randomBytes(32));
const keyFor = async (id) => id === "fixture-v1" ? proofKey : undefined;
const signing = async () => ({ id: "fixture-v1", material: proofKey });
const plain = Buffer.from("Private tenant document.");

function privateObjects() {
  const key = randomBytes(32);
  const encrypted = new Map();
  return {
    count: () => encrypted.size,
    async putIfAbsent(name, bytes, signal) {
      signal.throwIfAborted();
      if (encrypted.has(name)) return;
      const nonce = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, nonce);
      cipher.setAAD(Buffer.from(name));
      const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
      encrypted.set(name, { nonce, ciphertext, tag: cipher.getAuthTag() });
    },
    async read(name, maxBytes, signal) {
      signal.throwIfAborted();
      const item = encrypted.get(name);
      if (!item || item.ciphertext.length > maxBytes) return undefined;
      const decipher = createDecipheriv("aes-256-gcm", key, item.nonce);
      decipher.setAAD(Buffer.from(name));
      decipher.setAuthTag(item.tag);
      return Buffer.concat([decipher.update(item.ciphertext), decipher.final()]);
    },
  };
}

function actorSelection(principal) {
  if (principal.identityRef === "session-b-b2") return b2;
  return principal.id === "fictional-b" ? b1 : a1;
}
function authority(principal, scope) {
  const isWorker = principal.kind === "service";
  const actions = isWorker ? [fileAccess.scan] : Object.values(fileAccess).filter((access) => access !== fileAccess.scan);
  return {
    principal, active: true, revision: "1", tenantId: scope.tenantId, membershipId: isWorker ? undefined : "membership",
    branch: { tenantId: scope.tenantId, id: scope.branchId, active: true },
    ownerId: principal.id,
    grants: actions.map((access) => ({
      ...access, scope: isWorker ? "BRANCH" : "SELF", branchId: scope.branchId,
    })),
  };
}

export async function exerciseFiles(t, db, setupBroker) {
  const storage = privateObjects();
  const reload = async (_tx, auth) => authority(auth.principal, {
    tenantId: auth.tenantId, branchId: auth.scope.branchId,
  });
  let now = Math.floor(Date.now() / 1000);
  let scan = async () => "clean";
  let scans = 0;
  const repository = new FileRepository(db, reload);
  const service = new FileService(repository, storage, createSecretKey(randomBytes(32)), () => now);
  const processor = scanProcessor(repository, storage, (bytes) => { scans++; return scan(bytes); }, {
    executor, authenticateService: async () => executor, keyFor,
    resolve: async (principal, selection) => authority(principal, selection),
  }, reload);
  const deliveries = [];
  const dispatcher = new ScanDispatcher(repository, async (id, reference) => { deliveries.push({ id, reference }); }, signing);
  const processNext = async () => {
    assert.equal(await dispatcher.dispatch(), 1);
    const { id, reference } = deliveries.at(-1);
    return processor(id, reference);
  };

  const f = createFixtures();
  const b2session = f.sessions.get("session-b-bearer");
  f.sessions.set("session-b-b2", { ...b2session, binding: { ...b2session.binding, sessionId: "session-b-b2" } });
  f.sessions.set("session-peer-bearer", {
    ...f.sessions.get("session-a-bearer"), subject: "fictional-peer",
    binding: { ...f.sessions.get("session-a-bearer").binding, sessionId: "session-peer-bearer", providerSubject: "provider-peer" },
  });
  const { app } = await createProtectedApi(environment(), {
    ...f.deps,
    memberships: (subject) => subject === "fictional-peer"
      ? Promise.resolve([{ id: "membership-peer", tenantId: a1.tenantId }]) : f.deps.memberships(subject),
  }, withPrivateFiles(service), { resolve: async (principal) => authority(principal, actorSelection(principal)) });
  await app.listen(0, "127.0.0.1");
  t.after(() => app.close());

  const http = supertest(app.getHttpServer());
  const token = (actor = "a") => f.credential(actor === "b2" ? "b" : actor, "bearer", f.old,
    actor === "b2" ? { sessionId: "session-b-b2" } : {});
  const auth = (req, actor) => req.set("Authorization", "Bearer " + token(actor));
  const create = (requestKey, actor, body = { filename: "record.txt", sizeBytes: plain.length, mediaType: "text/plain" }) =>
    auth(http.post("/api/v1/file-intents"), actor).set("Idempotency-Key", requestKey).send(body);
  const upload = (file, bytes = plain, actor) => auth(http.put("/api/v1/files/" + file + "/content"), actor)
    .send({ contentBase64: Buffer.from(bytes).toString("base64") });
  const link = (file, actor) => auth(http.post("/api/v1/files/" + file + "/download-link"), actor);
  const status = (job, actor) => auth(http.get("/api/v1/file-jobs/" + job), actor);
  const cancel = (job, version, actor) => auth(http.post("/api/v1/file-jobs/" + job + "/cancel"), actor)
    .set("If-Match", JSON.stringify(String(version)));
  const id = async (code, actor) => (await create(code, actor).expect(201)).body.fileId;

  await t.test("FILE-01 authorized intent, quarantine, scan and authenticated download", async () => {
    const client = new BusinessOSApiClient(await app.getUrl(), () => token());
    const intent = await client.createFileIntent({ filename: "notes.txt", mediaType: "text/plain", sizeBytes: plain.length },
      { idempotencyKey: "file-main" });
    const job = await client.uploadFileContent(intent.fileId, { contentBase64: plain.toString("base64") });
    assert.equal(job.state, "QUEUED");
    await link(intent.fileId).expect(409);
    if (setupBroker) {
      const broker = await setupBroker({ processor, repository, signing });
      try {
        const end = Date.now() + 8000;
        while (Date.now() < end && (await client.getFileJob(job.jobId)).state !== "SUCCEEDED") {
          await wait(100);
        }
      } finally { await broker.close(); }
    } else {
      assert.equal(await processNext(), "APPLIED");
    }
    assert.equal((await client.getFileJob(job.jobId)).state, "SUCCEEDED");
    const granted = await client.createFileDownloadLink(intent.fileId);
    const url = new URL(granted.url, "https://fixture.invalid");
    const binary = await client.downloadFile(intent.fileId, { grant: url.searchParams.get("grant") });
    assert.deepEqual(Buffer.from(binary), plain);
    const output = await auth(http.get(granted.url)).expect(200);
    assert.match(output.headers["content-disposition"], /^attachment;/);
    assert.equal(output.headers["cache-control"], "no-store");
    await http.get(granted.url).expect(401);
    assert.equal(storage.count(), 1);
  });

  await t.test("FILE-02 malformed metadata and content, traversal and size limits", async () => {
    const sample = { filename: "record.txt", sizeBytes: plain.length, mediaType: "text/plain" };
    for (const filename of ["../no.txt", "path/inner.txt", "a..txt", "con.txt", "line\r\n.txt"]) {
      await create("invalid", "a", { ...sample, filename }).expect(400);
    }
    await create("invalid", "a", { ...sample, mediaType: "application/pdf" }).expect(415);
    await create("invalid", "a", { ...sample, sizeBytes: 16385 }).expect(413);
    const file = await id("invalid-content");
    await upload(file, Buffer.from([0xc0, 0x80, 0xc0])).expect(415);
    await upload(file, "truncated").expect(400);
    await upload(file, Buffer.alloc(16385, 65)).expect(413);
    await auth(http.put("/api/v1/files/" + file + "/content")).send({ contentBase64: "YR==" }).expect(400);
    await auth(http.put("/api/v1/files/" + file + "/content")).send({ contentBase64: "YQ==", tenantId: b1.tenantId }).expect(400);
    assert.equal(storage.count(), 1);
  });

  await t.test("FILE-03 tenant, branch, owner, signed grant expiry and scope", async () => {
    const bFile = await id("b-source", "b");
    const { jobId } = (await upload(bFile, plain, "b").expect(200)).body;
    assert.equal(await processNext(), "APPLIED");
    const issued = (await link(bFile, "b").expect(201)).body;
    await link(bFile).expect(404);
    await status(jobId, "b2").expect(404);
    await cancel(jobId, 1, "a").expect(404);
    await auth(http.get(issued.url), "b2").expect(404);
    const alternate = await id("a-source");
    await upload(alternate, plain, "peer").expect(404);
    await link(alternate, "peer").expect(404);
    await auth(http.get(issued.url.replace(/.$/, (tail) => tail === "A" ? "B" : "A")), "b").expect(404);
    now += 60;
    await auth(http.get(issued.url), "b").expect(404);
  });

  await t.test("FILE-04 idempotent intents and upload, cancellation and stale broker delivery", async () => {
    const file = await id("stable");
    assert.equal(await id("stable"), file);
    await create("stable", "a", { filename: "other.txt", sizeBytes: plain.length, mediaType: "text/plain" }).expect(409);
    const responses = await Promise.all([upload(file).expect(200), upload(file).expect(200)]);
    const { jobId } = responses[0].body;
    assert.equal(responses[1].body.jobId, jobId);
    await upload(file, Buffer.alloc(plain.length, 65)).expect(409);
    assert.equal(await dispatcher.dispatch(), 1);
    const { id: delivery, reference } = deliveries.at(-1);
    const running = (await status(jobId).expect(200)).body;
    assert.equal(running.state, "RUNNING");
    await auth(http.post("/api/v1/file-jobs/" + jobId + "/cancel")).expect(400);
    await cancel(jobId, running.version - 1).expect(409);
    await cancel(jobId, running.version).expect(200);
    await cancel(jobId, running.version).expect(200);
    const previous = scans;
    assert.equal(await processor(delivery, reference), "DENIED");
    assert.equal(scans, previous);
    await link(file).expect(409);

    const duringScan = await id("cancel-in-flight");
    const racing = (await upload(duringScan).expect(200)).body;
    const scanning = Promise.withResolvers();
    const finishScan = Promise.withResolvers();
    scan = async () => {
      scanning.resolve();
      await finishScan.promise;
      return "clean";
    };
    const processing = processNext();
    try {
      await Promise.race([scanning.promise, processing.then(() => assert.fail("expected a running scan"))]);
      const current = (await status(racing.jobId).expect(200)).body;
      await cancel(racing.jobId, current.version).expect(200);
    } finally {
      finishScan.resolve();
    }
    assert.equal(await processing, "STALE");
    await link(duringScan).expect(409);

    scan = async () => "rejected";
    const blocked = await id("rejected");
    const result = (await upload(blocked).expect(200)).body;
    assert.equal(await processNext(), "APPLIED");
    assert.equal((await status(result.jobId).expect(200)).body.failure, "SCAN_REJECTED");
    await link(blocked).expect(409);
  });

  await t.test("FILE-05 bounded scanner outage, rejected proof and redis loss recovery", async () => {
    scan = async () => "unavailable";
    const file = await id("failed");
    const { jobId } = (await upload(file).expect(200)).body;
    for (let i = 0; i < 3; i++) {
      await db.$executeRawUnsafe("UPDATE file_jobs SET next_attempt_at=clock_timestamp() WHERE id=$1::uuid", jobId);
      assert.equal(await dispatcher.dispatch(), 1);
      const { id: delivery, reference } = deliveries.at(-1);
      assert.equal(await processor(delivery, { ...reference, tenantId: b2.tenantId }), "DENIED");
      assert.equal(await processor(delivery, reference), i === 2 ? "APPLIED" : "RETRY");
    }
    assert.deepEqual((await status(jobId).expect(200)).body.failure, "SCAN_UNAVAILABLE");
    await link(file).expect(409);

    scan = async () => "clean";
    const recover = await id("recover");
    const lost = (await upload(recover).expect(200)).body;
    const broken = new ScanDispatcher(repository, async () => { throw new Error("synthetic broker outage"); }, signing);
    await assert.rejects(broken.dispatch(), { code: "UNAVAILABLE" });
    await db.$executeRawUnsafe("UPDATE file_jobs SET lease_until=clock_timestamp() WHERE id=$1::uuid", lost.jobId);
    assert.equal(await processNext(), "APPLIED");
    assert.equal((await status(lost.jobId).expect(200)).body.state, "SUCCEEDED");
  });
  const [violations] = await db.$queryRawUnsafe(`SELECT count(*)::int AS count FROM file_jobs j
    JOIN file_objects f ON (f.tenant_id,f.branch_id,f.id)=(j.tenant_id,j.branch_id,j.file_id)
    WHERE f.state='AVAILABLE' AND j.state<>'SUCCEEDED'`);
  assert.equal(violations.count, 0);
  const foreignFile = await id("fk-mismatch");
  await assert.rejects(db.$executeRawUnsafe(`INSERT INTO file_jobs(id,tenant_id,branch_id,file_id,correlation_id)
    VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid)`, randomUUID(), b2.tenantId, b2.branchId, foreignFile,
  randomUUID()), (error) => error.code === "23503"
    || error.meta?.driverAdapterError?.cause?.originalCode === "23503");
}
