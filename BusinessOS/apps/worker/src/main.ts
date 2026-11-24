import "reflect-metadata";
import { Logger, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

@Module({})
class WorkerModule {}

const app = await NestFactory.createApplicationContext(WorkerModule);
Logger.log("Worker bootstrap complete", "Worker");
await app.close();
