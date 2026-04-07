import type { CreateUserDraft, User } from "../../domain/user";

import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../infrastructure/prisma/prisma.service";
import {
  DuplicateUserEmailError,
  type UserRepository,
} from "../../domain/user.repository";

const mapUser = (user: Prisma.UserGetPayload<Record<string, never>>): User => ({
  createdAt: user.createdAt,
  email: user.email,
  id: user.id,
  name: user.name,
  role: user.role,
  updatedAt: user.updatedAt,
});

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
  ) {}

  async create(input: CreateUserDraft) {
    try {
      const user = await this.prismaService.user.create({
        data: {
          email: input.email,
          name: input.name,
          role: input.role,
        },
      });

      return mapUser(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new DuplicateUserEmailError();
      }

      throw error;
    }
  }

  async findById(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
    });

    return user ? mapUser(user) : null;
  }

  async list() {
    const users = await this.prismaService.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return users.map(mapUser);
  }
}
