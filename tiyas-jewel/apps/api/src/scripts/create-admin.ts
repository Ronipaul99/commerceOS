import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { adminPasswordSchema, adminLoginSchema } from "@tiyas/shared";
import { hashPassword } from "../modules/admin/auth.js";
loadEnv({
  path: fileURLToPath(new URL("../../../../.env", import.meta.url)),
  quiet: true,
});
let db: PrismaClient | undefined;
try {
  if (!process.env.DATABASE_URL) throw Error("DATABASE_URL is required");
  let email = process.env.ADMIN_EMAIL,
    password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    if (!process.stdin.isTTY)
      throw Error(
        "Provide ADMIN_EMAIL and ADMIN_PASSWORD through the environment for non-interactive use",
      );
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    email = await rl.question("Admin email: ");
    rl.close();
    let mute = false;
    const output = new Writable({
      write(chunk, _encoding, callback) {
        if (!mute) process.stdout.write(chunk);
        callback();
      },
    });
    const hidden = createInterface({
      input: process.stdin,
      output,
      terminal: true,
    });
    process.stdout.write("Admin password (14+ characters, hidden): ");
    mute = true;
    password = await hidden.question("");
    process.stdout.write("\nConfirm password (hidden): ");
    const confirmation = await hidden.question("");
    hidden.close();
    process.stdout.write("\n");
    if (password !== confirmation) throw Error("Passwords do not match");
  }
  const input = adminLoginSchema.parse({ email, password });
  adminPasswordSchema.parse(input.password);
  db = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: 5000,
    }),
  });
  if (await db.adminUser.findUnique({ where: { email: input.email } }))
    throw Error(
      "An admin with this email already exists; no credentials changed",
    );
  await db.adminUser.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.password),
    },
  });
  process.stdout.write("Admin created. No credentials were printed.\n");
} catch (error) {
  // Do not print driver errors, connection strings, passwords or raw Zod inputs.
  const safe =
    error instanceof Error &&
    [
      /^DATABASE_URL is required$/,
      /^Provide ADMIN_/,
      /^Passwords do not match$/,
      /^An admin with/,
    ].some((p) => p.test(error.message));
  process.stderr.write(
    safe
      ? `${(error as Error).message}\n`
      : "Admin creation failed. Check the database, email and password requirements.\n",
  );
  process.exitCode = 1;
} finally {
  delete process.env.ADMIN_PASSWORD;
  await db?.$disconnect();
}
