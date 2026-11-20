import { z } from "zod";
export class AdminApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function adminRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: { method?: string; body?: unknown; csrf?: string; file?: File } = {},
) {
  const method = options.method ?? "GET";
  const form = options.file ? new FormData() : undefined;
  if (form) form.append("image", options.file!);
  const response = await fetch(`/api/v1/admin${path}`, {
    method,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(options.csrf ? { "X-CSRF-Token": options.csrf } : {}),
      ...(!form && options.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body:
      form ??
      (options.body !== undefined ? JSON.stringify(options.body) : undefined),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = z
      .object({
        error: z.object({
          message: z.string(),
          issues: z
            .array(z.object({ path: z.string(), message: z.string() }))
            .optional(),
        }),
      })
      .safeParse(payload);
    throw new AdminApiError(
      response.status,
      error.success
        ? error.data.error.message +
            (error.data.error.issues
              ?.map((i) => ` ${i.path}: ${i.message}`)
              .join("") ?? "")
        : "Request could not be completed. Please try again.",
    );
  }
  return schema.parse(payload);
}
export const adminOkSchema = z.object({
  data: z.object({ ok: z.literal(true) }),
});
