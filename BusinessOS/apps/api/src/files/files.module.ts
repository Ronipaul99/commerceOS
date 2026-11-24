import {
  Body, Controller, Get, HttpCode, HttpException, Module, Param, Post, Put, Req, Res, StreamableFile,
} from "@nestjs/common";
import type { DynamicModule, Type } from "@nestjs/common";
import { ContextError } from "@businessos/execution-context";
import { fileAccess, FileError, FileService } from "@businessos/file-jobs";
import type { FileErrorCode, JobStatus } from "@businessos/file-jobs";
import { Buffer } from "node:buffer";
import type { ServerResponse } from "node:http";
import { AppModule } from "../app.module.js";
import { invalid, RequireIdempotency, versionTag } from "../http/contract.js";
import type { ContractRequest } from "../http/contract.js";
import { RequireScope, requireExecutionContext } from "../http/scoped.js";

const statuses: Record<FileErrorCode, number> = {
  BAD_REQUEST: 400, TOO_LARGE: 413, TYPE_UNSUPPORTED: 415, CONFLICT: 409, NOT_FOUND: 404, UNAVAILABLE: 503,
};

async function execute<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof HttpException || error instanceof ContextError) throw error;
    // Never let storage or database errors supply response details.
    throw new HttpException("Private file operation could not be completed.", error instanceof FileError ? statuses[error.code] : 503);
  }
}

function requireNoBody(body: unknown) {
  if (body !== undefined && (body === null || typeof body !== "object" || Reflect.ownKeys(body).length)) invalid("body");
}
function requireNoQuery(request: ContractRequest) {
  if (Object.keys(request.query ?? {}).length) invalid("query");
}
function reply(response: ServerResponse, job: JobStatus): JobStatus {
  response.setHeader("ETag", versionTag(job.version));
  return job;
}

@Controller("api/v1")
class FilesController {
  constructor(private readonly service: FileService) {}

  @Post("file-intents")
  @RequireScope(fileAccess.upload)
  @RequireIdempotency()
  create(@Req() request: ContractRequest, @Body() body: unknown) {
    requireNoQuery(request);
    return execute(() => this.service.create(requireExecutionContext(request), request.idempotencyKey, body));
  }

  @Put("files/:fileId/content")
  @RequireScope(fileAccess.upload)
  async put(
    @Req() request: ContractRequest, @Param("fileId") fileId: string, @Body() body: unknown,
    @Res({ passthrough: true }) response: ServerResponse,
  ) {
    requireNoQuery(request);
    if (request.headers["content-type"]?.split(";", 1)[0]?.toLowerCase() !== "application/json") {
      throw new HttpException("JSON content type required.", 415);
    }
    return reply(response, await execute(() => this.service.upload(requireExecutionContext(request), fileId, body)));
  }

  @Post("files/:fileId/download-link")
  @RequireScope(fileAccess.download)
  link(@Req() request: ContractRequest, @Param("fileId") fileId: string, @Body() body: unknown) {
    requireNoBody(body);
    requireNoQuery(request);
    return execute(() => this.service.issueDownload(requireExecutionContext(request), fileId));
  }

  @Get("files/:fileId/download")
  @RequireScope(fileAccess.download)
  async download(@Req() request: ContractRequest, @Param("fileId") fileId: string) {
    const query = request.query as Record<string, unknown>;
    if (!query || Object.keys(query).length !== 1 || !Object.hasOwn(query, "grant")) throw new HttpException("Unavailable.", 404);
    const { bytes, filename } = await execute(() => this.service.download(requireExecutionContext(request), fileId, query.grant));
    return new StreamableFile(Buffer.from(bytes), {
      type: "application/octet-stream", length: bytes.byteLength, disposition: 'attachment; filename="' + filename + '"',
    });
  }

  @Get("file-jobs/:jobId")
  @RequireScope(fileAccess.status)
  async status(
    @Req() request: ContractRequest, @Param("jobId") jobId: string, @Res({ passthrough: true }) response: ServerResponse,
  ) {
    requireNoQuery(request);
    return reply(response, await execute(() => this.service.repository.status(requireExecutionContext(request), jobId)));
  }

  @Post("file-jobs/:jobId/cancel")
  @HttpCode(200)
  @RequireScope(fileAccess.cancel)
  async cancel(
    @Req() request: ContractRequest, @Param("jobId") jobId: string, @Body() body: unknown,
    @Res({ passthrough: true }) response: ServerResponse,
  ) {
    requireNoQuery(request);
    requireNoBody(body);
    const header = request.headers["if-match"];
    const match = typeof header === "string" && /^"([1-9][0-9]{0,9})"(?![\s\S])/.exec(header);
    if (!match || Number(match[1]) > 2147483647) invalid("If-Match");
    return reply(response, await execute(() => this.service.repository.cancel(
      requireExecutionContext(request), jobId, Number(match[1]),
    )));
  }
}

@Module({})
class FilesModule {}

export function withPrivateFiles(service: FileService, root: Type = AppModule): Type {
  const registration: DynamicModule = {
    module: FilesModule, controllers: [FilesController], providers: [{ provide: FileService, useValue: service }],
  };
  @Module({ imports: [root, registration] })
  class FilesApi {}
  return FilesApi;
}
