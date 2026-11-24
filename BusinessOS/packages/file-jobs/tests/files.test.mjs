import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomBytes, createSecretKey, randomUUID } from "node:crypto";
import { test } from "@jest/globals";
import { FileService, parseContent, parseIntent, S3PrivateStorage } from "../dist/index.js";

test("plain-text upload requires a safe filename, supported media type and exact integer size", () => {
  const args = { filename: "report.txt", mediaType: "text/plain", sizeBytes: 5 };
  assert.deepEqual(parseIntent(args), args);
  for (const filename of ["../report.txt", "x/y.txt", "x\\y.txt", "x\r\ny.txt", "LPT1.txt", "x..txt"]) {
    assert.throws(() => parseIntent({ ...args, filename }), { code: "BAD_REQUEST" });
  }
  assert.throws(() => parseIntent({ ...args, sizeBytes: 16385 }), { code: "TOO_LARGE" });
  assert.throws(() => parseIntent({ ...args, mediaType: "image/png" }), { code: "TYPE_UNSUPPORTED" });
  assert.throws(() => parseIntent({ ...args, sizeBytes: 0.25 }), { code: "BAD_REQUEST" });
});

test("upload rejects ambiguous base64, binary bytes, bidirectional overrides and surplus fields", () => {
  const input = Buffer.from("BusinessOS\n").toString("base64");
  assert.equal(parseContent({ contentBase64: input }).toString(), "BusinessOS\n");
  assert.throws(() => parseContent({ contentBase64: "YR==" }), { code: "BAD_REQUEST" });
  assert.throws(() => parseContent({ contentBase64: input, uploadKey: "unexpected" }), { code: "BAD_REQUEST" });
  for (const bytes of [Buffer.from([0xff, 0x80]), Buffer.from("text\0"), Buffer.from("text\u202E")]) {
    assert.throws(() => parseContent({ contentBase64: bytes.toString("base64") }), { code: "TYPE_UNSUPPORTED" });
  }
});

test("a download grant is tied to its originating session and exact expiry", async () => {
  const id = randomUUID();
  const row = { id, tenantId: randomUUID(), branchId: randomUUID(), state: "AVAILABLE", version: 2 };
  let now = 100;
  const service = new FileService({ download: async () => row }, {
    read: async () => assert.fail("unauthorized download must not reach object storage"),
  }, createSecretKey(randomBytes(32)), () => now);
  const principal = { id: "actor-a", identityRef: "session-original" };
  const context = { auth: { principal } };
  const { url } = await service.issueDownload(context, id);
  const proof = url.split("grant=")[1];
  await assert.rejects(service.download({ auth: { principal: { ...principal, identityRef: "different" } } }, id, proof),
    { code: "NOT_FOUND" });
  now += 60;
  await assert.rejects(service.download(context, id, proof), { code: "NOT_FOUND" });
});

test("S3 compatibility adapter requests encrypted conditional writes and bounds reads", async () => {
  const path = [randomUUID(), randomUUID(), randomUUID()].join("/");
  const payload = Buffer.from("bounded");
  const signal = new globalThis.AbortController().signal;
  let response = new globalThis.Response(null, { headers: { "x-amz-server-side-encryption": "AES256" } });
  const storage = new S3PrivateStorage("https://storage.invalid", "private-fixture", async (request) => {
    assert.equal(request.url, "https://storage.invalid/private-fixture/" + path);
    if (request.method === "PUT") {
      assert.equal(request.headers["if-none-match"], "*");
      assert.equal(request.headers["x-amz-server-side-encryption"], "AES256");
    }
    assert.match(request.headers["x-amz-content-sha256"], /^[a-f0-9]{64}$/);
    return { authorization: "fixture-proof", date: "fixture-date" };
  }, async (_url, options) => {
    assert.equal(options.redirect, "error");
    assert.equal(options.headers.authorization, "fixture-proof");
    return response;
  });
  await storage.putIfAbsent(path, payload, signal);
  response = new globalThis.Response(payload, { headers: { "x-amz-server-side-encryption": "AES256" } });
  assert.deepEqual(Buffer.from(await storage.read(path, payload.length, signal)), payload);
  response = new globalThis.Response(payload, { headers: { "x-amz-server-side-encryption": "AES256" } });
  await assert.rejects(storage.read(path, 2, signal), { code: "UNAVAILABLE" });
  response = new globalThis.Response(payload);
  await assert.rejects(storage.read(path, payload.length, signal), { code: "UNAVAILABLE" });
  await assert.rejects(storage.read("../path", payload.length, signal), { code: "UNAVAILABLE" });
});
