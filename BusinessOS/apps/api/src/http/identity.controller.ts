import { BadRequestException, Controller, Get, Query, Req } from "@nestjs/common";
import { PaginationPipe } from "./contract.js";
import type { ContractRequest } from "./contract.js";

@Controller("api/v1/me")
export class IdentityController {
  @Get()
  me(@Req() request: ContractRequest) {
    return { id: request.principal!.subject };
  }

  @Get("memberships")
  memberships(
    @Req() request: ContractRequest,
    @Query(new PaginationPipe()) { limit, cursor }: { limit: number; cursor?: string },
  ) {
    const principal = request.principal!;
    const rows = [...principal.memberships].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const cursorFor = (id: string) => Buffer.from(JSON.stringify([principal.subject, id])).toString("base64url");
    const offset = cursor === undefined ? 0 : rows.findIndex((row) => cursorFor(row.id) === cursor) + 1;
    if (cursor !== undefined && offset === 0) {
      throw new BadRequestException({ code: "INVALID_CURSOR", message: "The cursor is invalid for this collection." });
    }
    const page = rows.slice(offset, offset + limit + 1);
    const items = page.slice(0, limit).map(({ id, tenantId }) => ({ id, tenantId }));
    const last = items.at(-1);
    return { items, nextCursor: page.length > limit && last ? cursorFor(last.id) : null };
  }
}
