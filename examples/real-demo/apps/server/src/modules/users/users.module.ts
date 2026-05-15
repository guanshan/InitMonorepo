import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { USERS_REPOSITORY_PORT } from "./application/users-repository.port";
import { UsersService } from "./application/users.service";
import { PrismaUsersRepository } from "./infrastructure/prisma-users.repository";
import { UsersController } from "./interfaces/users.controller";

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: USERS_REPOSITORY_PORT,
      useClass: PrismaUsersRepository,
    },
  ],
})
export class UsersModule {}
