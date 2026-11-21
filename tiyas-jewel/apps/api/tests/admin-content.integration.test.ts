import { beforeAll, beforeEach, afterEach, describe, it, expect } from "vitest";
import { randomUUID, randomBytes } from "node:crypto";
import type { FastifyInstance, HTTPMethods } from "fastify";
import sharp from "sharp";
import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import { hashPassword } from "../src/modules/admin/auth.js";
const database = process.env.TEST_DATABASE_URL;
if (
  !database ||
  new URL(database).hostname !== "127.0.0.1" ||
  new URL(database).port !== "5433"
)
  throw Error("Use the isolated local test database on 5433");
const password = randomBytes(24).toString("hex"),
  newPassword = randomBytes(24).toString("hex");
let hash: string;
let app: FastifyInstance,
  owner: { id: string; email: string },
  manager: { id: string; email: string },
  cookie: string,
  csrf: string;
let sent: Map<string, string>,
  sendFailure: boolean,
  objects: Map<string, Buffer>;
const keys: string[] = [],
  ids: string[] = [];
const page = {
  type: "page",
  content: {
    title: "Care guide",
    description: "How to care for your jewellery.",
    body: "Keep dry.\n\nStore separately.",
    image: "",
    alt: "",
  },
};
beforeAll(async () => {
  hash = await hashPassword(password);
});
async function login(email: string) {
  const r = await app.inject({
    method: "POST",
    url: "/api/v1/admin/login",
    payload: { email, password },
  });
  expect(r.statusCode).toBe(200);
  return {
    cookie: r.cookies.map((c) => `${c.name}=${c.value}`).join("; "),
    csrf: r.json().data.csrfToken,
  };
}
beforeEach(async () => {
  sent = new Map();
  objects = new Map();
  sendFailure = false;
  app = await buildApp(
    parseEnv({
      DATABASE_URL: database,
      NODE_ENV: "test",
      ADMIN_OTP_SECRET: randomBytes(32).toString("hex"),
    }),
    {
      logger: false,
      background: false,
      email: {
        async sendOtp(email, code) {
          if (sendFailure) throw Error("SMTP offline");
          sent.set(email, code);
        },
      },
      storage: {
        async put(k, b) {
          objects.set(k, b);
        },
        async get(k) {
          const b = objects.get(k);
          if (!b) throw Error("Missing");
          return b;
        },
        async remove(k) {
          objects.delete(k);
        },
      },
    },
  );
  owner = await app.db.adminUser.create({
    data: {
      email: `cms-owner-${randomUUID()}@example.test`,
      passwordHash: hash,
    },
    select: { id: true, email: true },
  });
  manager = await app.db.adminUser.create({
    data: {
      email: `cms-editor-${randomUUID()}@example.test`,
      passwordHash: hash,
      role: "CONTENT_MANAGER",
    },
    select: { id: true, email: true },
  });
  ids.push(owner.id, manager.id);
  ({ cookie, csrf } = await login(owner.email));
});
afterEach(async () => {
  await app.db.contentDocument.deleteMany({ where: { key: { in: keys } } });
  keys.length = 0;
  await app.db.imageAsset.deleteMany({ where: { uploaderId: { in: ids } } });
  await app.db.adminUser.deleteMany({ where: { id: { in: ids } } });
  ids.length = 0;
  await app.close();
});
const req = (
  method: HTTPMethods,
  path: string,
  payload?: unknown,
  headers: Record<string, string> = {},
) =>
  app.inject({
    method,
    url: `/api/v1/admin${path}`,
    headers: { cookie, "x-csrf-token": csrf, ...headers },
    ...(payload === undefined ? {} : { payload: payload as object }),
  });
const key = () => {
  const k = `page-cms-${randomUUID()}`;
  keys.push(k);
  return k;
};
describe("CMS publication and access", () => {
  it("protects every content/user action and enforces CSRF", async () => {
    expect(
      (await app.inject({ method: "GET", url: "/api/v1/admin/content" }))
        .statusCode,
    ).toBe(401);
    expect(
      (
        await req(
          "PUT",
          `/content/${key()}`,
          { version: 0, value: page },
          { "x-csrf-token": "" },
        )
      ).statusCode,
    ).toBe(403);
  });
  it("isolates drafts, publishes, preserves live content during edits, prevents stale saves and unpublishes", async () => {
    const k = key();
    const saved = await req("PUT", `/content/${k}`, {
      version: 0,
      value: page,
    });
    expect(saved.statusCode).toBe(200);
    expect((await app.inject(`/api/v1/content/${k}`)).json().data).toBeNull();
    expect(
      (
        await req("POST", `/content/${k}/publish`, {
          version: 1,
          value: page,
          published: true,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (await app.inject(`/api/v1/content/${k}`)).json().data.content.title,
    ).toBe("Care guide");
    const revised = {
      ...page,
      content: { ...page.content, title: "Draft revision" },
    };
    expect(
      (await req("PUT", `/content/${k}`, { version: 2, value: revised }))
        .statusCode,
    ).toBe(200);
    expect(
      (await app.inject(`/api/v1/content/${k}`)).json().data.content.title,
    ).toBe("Care guide");
    expect(
      (await req("PUT", `/content/${k}`, { version: 1, value: page }))
        .statusCode,
    ).toBe(409);
    expect(
      (
        await req("POST", `/content/${k}/publish`, {
          version: 3,
          value: revised,
          published: false,
        })
      ).statusCode,
    ).toBe(200);
    expect((await app.inject(`/api/v1/content/${k}`)).json().data).toBeNull();
    expect(
      (await req("DELETE", `/content/${k}`, { version: 4 })).statusCode,
    ).toBe(200);
  });
  it("rejects type mismatches, unsafe links, unknown images and unknown fields", async () => {
    expect(
      (
        await req("PUT", `/content/${key()}`, {
          version: 0,
          value: { type: "navigation", content: { mobile: [], footer: [] } },
        })
      ).statusCode,
    ).toBe(400);
    const k = key();
    expect(
      (
        await req("PUT", `/content/${k}`, {
          version: 0,
          value: {
            ...page,
            content: {
              ...page.content,
              image: `/images/uploads/${randomUUID()}.webp`,
            },
          },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await req("PUT", "/content/navigation", {
          version: 0,
          value: {
            type: "navigation",
            content: {
              mobile: [{ label: "Bad", href: "javascript:alert(1)" }],
              footer: [],
            },
          },
        })
      ).statusCode,
    ).toBe(400);
  });
  it("keeps unpublished assets private and protects draft/published media from deletion", async () => {
    const buffer = await sharp({
        create: { width: 400, height: 300, channels: 3, background: "#850528" },
      })
        .png()
        .toBuffer(),
      boundary = `cms-${randomUUID()}`;
    const payload = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="banner.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      buffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const uploaded = await app.inject({
      method: "POST",
      url: "/api/v1/admin/images",
      headers: {
        cookie,
        "x-csrf-token": csrf,
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });
    expect(uploaded.statusCode).toBe(201);
    const asset = uploaded.json().data;
    expect((await app.inject(asset.url)).statusCode).toBe(404);
    const k = key(),
      value = {
        ...page,
        content: {
          ...page.content,
          image: asset.url,
          alt: "Jewellery campaign",
        },
      };
    expect(
      (await req("PUT", `/content/${k}`, { version: 0, value })).statusCode,
    ).toBe(200);
    expect((await req("DELETE", `/images/${asset.id}`)).statusCode).toBe(409);
    expect(
      (
        await req("POST", `/content/${k}/publish`, {
          version: 1,
          value,
          published: true,
        })
      ).statusCode,
    ).toBe(200);
    expect((await app.inject(asset.url)).statusCode).toBe(200);
    await req("POST", `/content/${k}/publish`, {
      version: 2,
      value,
      published: false,
    });
    expect((await app.inject(asset.url)).statusCode).toBe(404);
  });
  it("limits content managers to CMS and media and protects owner access", async () => {
    const editor = await login(manager.email);
    const headers = { cookie: editor.cookie, "x-csrf-token": editor.csrf };
    for (const path of ["/users", "/products", "/orders", "/dashboard"])
      expect((await req("GET", path, undefined, headers)).statusCode).toBe(403);
    expect((await req("GET", "/content", undefined, headers)).statusCode).toBe(
      200,
    );
    expect(
      (await req("PUT", `/users/${owner.id}`, { role: "ADMIN", active: false }))
        .statusCode,
    ).toBe(403);
  });
});
describe("email OTP and invitations", () => {
  it("does not reveal whether an address exists or disclose OTPs", async () => {
    const missing = await req("POST", "/access/request", {
      email: "absent@example.test",
      purpose: "RESET",
    });
    const known = await req("POST", "/access/request", {
      email: owner.email,
      purpose: "RESET",
    });
    expect(known.json()).toEqual(missing.json());
    const code = sent.get(owner.email)!;
    expect(code).toMatch(/^\d{6}$/);
    expect(known.body).not.toContain(code);
    expect(
      (await app.db.adminOtp.findFirstOrThrow({ where: { adminId: owner.id } }))
        .codeHash,
    ).not.toBe(code);
    await req("POST", "/access/request", {
      email: owner.email,
      purpose: "RESET",
    });
    expect(sent.size).toBe(1);
  });
  it("resets a password once and revokes existing sessions", async () => {
    await req("POST", "/access/request", {
      email: owner.email,
      purpose: "RESET",
    });
    const input = {
      email: owner.email,
      purpose: "RESET",
      code: sent.get(owner.email),
      password: newPassword,
    };
    expect((await req("POST", "/access/complete", input)).statusCode).toBe(200);
    expect((await req("GET", "/session")).statusCode).toBe(401);
    expect((await req("POST", "/access/complete", input)).statusCode).toBe(400);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/admin/login",
          payload: { email: owner.email, password: newPassword },
        })
      ).statusCode,
    ).toBe(200);
  });
  it("expires codes and locks after five incorrect attempts", async () => {
    await req("POST", "/access/request", {
      email: owner.email,
      purpose: "RESET",
    });
    const correct = sent.get(owner.email)!;
    const wrong = correct === "000000" ? "000001" : "000000";
    for (let i = 0; i < 5; i++)
      expect(
        (
          await req("POST", "/access/complete", {
            email: owner.email,
            purpose: "RESET",
            code: wrong,
            password: newPassword,
          })
        ).statusCode,
      ).toBe(400);
    expect(
      (
        await req("POST", "/access/complete", {
          email: owner.email,
          purpose: "RESET",
          code: correct,
          password: newPassword,
        })
      ).statusCode,
    ).toBe(400);
    await app.db.adminOtp.updateMany({
      where: { adminId: owner.id },
      data: { attempts: 0, expiresAt: new Date(0) },
    });
    expect(
      (
        await req("POST", "/access/complete", {
          email: owner.email,
          purpose: "RESET",
          code: correct,
          password: newPassword,
        })
      ).statusCode,
    ).toBe(400);
  });
  it("invites a content manager with email OTP and enforces its role", async () => {
    const address = `cms-invite-${randomUUID()}@example.test`;
    const invite = await req("POST", "/users", {
      name: "Content Editor",
      email: address,
      role: "CONTENT_MANAGER",
      active: true,
      message: "",
    });
    expect(invite.statusCode).toBe(201);
    const id = invite.json().data.id;
    ids.push(id);
    expect(invite.json().data.invited).toBe(true);
    expect(
      (
        await req("POST", "/access/complete", {
          email: address,
          purpose: "INVITE",
          code: sent.get(address),
          password: newPassword,
        })
      ).statusCode,
    ).toBe(200);
    const session = await app.inject({
      method: "POST",
      url: "/api/v1/admin/login",
      payload: { email: address, password: newPassword },
    });
    expect(session.statusCode).toBe(200);
    expect(session.json().data.role).toBe("CONTENT_MANAGER");
    expect(
      (
        await req("PUT", `/users/${id}`, {
          role: "CONTENT_MANAGER",
          active: false,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: "GET",
          url: "/api/v1/admin/session",
          headers: {
            cookie: session.cookies
              .map((c) => `${c.name}=${c.value}`)
              .join("; "),
          },
        })
      ).statusCode,
    ).toBe(401);
  });
  it("does not leave a usable OTP after email failure", async () => {
    sendFailure = true;
    expect(
      (
        await req("POST", "/access/request", {
          email: owner.email,
          purpose: "RESET",
        })
      ).statusCode,
    ).toBe(200);
    expect(await app.db.adminOtp.count({ where: { adminId: owner.id } })).toBe(
      0,
    );
    expect(sent.size).toBe(0);
  });
});
