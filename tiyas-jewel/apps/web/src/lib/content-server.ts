import "server-only";
import { cache } from "react";
import { publicContentResponseSchema } from "@tiyas/shared";
import { apiOrigin } from "./api-server";
export const publishedContent = cache(async (key: string) => {
  try {
    const response = await fetch(
      `${apiOrigin()}/api/v1/content/${encodeURIComponent(key)}`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) return null;
    return publicContentResponseSchema.parse(await response.json()).data;
  } catch {
    return null;
  }
});
