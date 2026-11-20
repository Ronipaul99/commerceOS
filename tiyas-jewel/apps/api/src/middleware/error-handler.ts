import type { FastifyInstance } from "fastify";
import { CheckoutError } from "../modules/checkout/errors.js";
import { ZodError } from "zod";

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof CheckoutError)
      return reply
        .code(error.statusCode)
        .send({
          error: {
            code: error.code,
            message: error.message,
            requestId: request.id,
          },
        });
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          requestId: request.id,
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
    }
    const httpError = (
      typeof error === "object" && error !== null ? error : {}
    ) as { statusCode?: number; name?: string };
    const status =
      typeof httpError.statusCode === "number" &&
      httpError.statusCode >= 400 &&
      httpError.statusCode < 500
        ? httpError.statusCode
        : 500;
    // Do not log raw driver errors or connection strings; correlate using requestId.
    if (status === 500)
      request.log.error(
        { errorType: httpError.name ?? "Error", requestId: request.id },
        "Request failed",
      );
    return reply.code(status).send({
      error: {
        code: status === 500 ? "INTERNAL_ERROR" : "BAD_REQUEST",
        message:
          status === 500 ? "An unexpected error occurred" : "Invalid request",
        requestId: request.id,
      },
    });
  });
  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      error: {
        code: "NOT_FOUND",
        message: "Resource not found",
        requestId: request.id,
      },
    }),
  );
}
