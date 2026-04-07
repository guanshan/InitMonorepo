import type { PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

import { BadRequestException, Injectable } from "@nestjs/common";

@Injectable()
export class ZodValidationPipe<TOutput> implements PipeTransform {
  constructor(private readonly schema: ZodType<TOutput>) {}

  transform(value: unknown): TOutput {
    const parsed = this.schema.safeParse(value);

    if (!parsed.success) {
      throw new BadRequestException({
        error: {
          code: "validation_error",
          message: "Request validation failed.",
        },
        issues: parsed.error.flatten(),
        success: false,
      });
    }

    return parsed.data;
  }
}
