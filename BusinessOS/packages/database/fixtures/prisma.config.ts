import { defineConfig } from "prisma/config";
import { fixtureUrl } from "./target.mjs";

const migration = process.env.M0104_MIGRATION_URL;

export default defineConfig({
  schema: "schema.prisma",
  migrations: { path: process.env.M0104_MIGRATION_PATH ?? "migrations" },
  ...(migration === undefined ? {} : { datasource: { url: fixtureUrl(migration, "migrator") } }),
});
