import { createServer } from "node:http";

const objectPath = "/objects/smoke.txt";
const limit = 4096;
let fixture;

createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200).end("ok");
    return;
  }
  if (request.url !== objectPath) {
    response.writeHead(404).end();
    return;
  }
  if (request.method === "GET") {
    if (fixture === undefined) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": "text/plain", "cache-control": "no-store" }).end(fixture);
    return;
  }
  if (request.method !== "PUT") {
    response.writeHead(405, { allow: "GET, PUT" }).end();
    return;
  }
  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of request.iterator({ destroyOnReturn: false })) {
      size += chunk.length;
      if (size > limit) {
        response.writeHead(413, { connection: "close" }).end();
        return;
      }
      chunks.push(chunk);
    }
    fixture = Buffer.concat(chunks);
    response.writeHead(204).end();
  } catch {
    response.destroy();
  }
}).listen(Number(process.env.PORT ?? 3100), process.env.HOST ?? "127.0.0.1");
