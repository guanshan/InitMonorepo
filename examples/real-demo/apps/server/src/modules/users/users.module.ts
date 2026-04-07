import { Module } from "@nestjs/common";

import { CreateUserUseCase } from "./application/use-cases/create-user.use-case";
import { GetUserByIdUseCase } from "./application/use-cases/get-user-by-id.use-case";
import { ListUsersUseCase } from "./application/use-cases/list-users.use-case";
import { USER_REPOSITORY } from "./domain/user.repository";
import { UsersController } from "./interfaces/users.controller";
import { PrismaUserRepository } from "./infrastructure/persistence/prisma-user.repository";

@Module({
  controllers: [UsersController],
  providers: [
    CreateUserUseCase,
    GetUserByIdUseCase,
    ListUsersUseCase,
    PrismaUserRepository,
    {
      provide: USER_REPOSITORY,
      useExisting: PrismaUserRepository,
    },
  ],
})
export class UsersModule {}
