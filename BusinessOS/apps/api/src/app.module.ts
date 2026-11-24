import { Controller, Get, Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { IdentityController } from "./http/identity.controller.js";

@Controller()
class AppController {
  @Get()
  describe() {
    return { service: "businessos-api" };
  }
}

@Module({ controllers: [AppController, HealthController, IdentityController] })
export class AppModule {}
