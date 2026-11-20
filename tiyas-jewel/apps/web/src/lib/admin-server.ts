import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { z } from "zod";
import { adminSessionSchema } from "@tiyas/shared";
import { apiOrigin } from "./api-server";
async function adminFetch(path: string) {
  const jar = await cookies();
  const cookie = ["__Host-tiyas_admin", "tiyas_admin"]
    .flatMap((name) => {
      const value = jar.get(name)?.value;
      return value && /^[a-f0-9]{64}$/.test(value) ? [`${name}=${value}`] : [];
    })
    .join("; ");
  if (!cookie) redirect("/admin/login");
  const response = await fetch(`${apiOrigin()}/api/v1/admin${path}`, {
    cache: "no-store",
    headers: { Cookie: cookie, Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 401) redirect("/admin/login");
  if (response.status === 404) notFound();
  if (!response.ok)
    throw Error(
      "Admin information is temporarily unavailable. Please try again.",
    );
  return response.json();
}
export const requireAdmin = cache(
  async () => adminSessionSchema.parse(await adminFetch("/session")).data,
);
export async function adminGet<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T> {
  await requireAdmin();
  return schema.parse(await adminFetch(path));
}
