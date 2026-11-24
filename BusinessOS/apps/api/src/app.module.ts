import { Controller, Get, Module } from "@nestjs/common";

@Controller()
class AppController {
  @Get()
  describe() {
    return { service: "businessos-api" };
  }
}

@Module({ controllers: [AppController] })
export class AppModule {}
