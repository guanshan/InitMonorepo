/*
 * AES-256-GCM at-rest encryption for provider API keys.
 *
 * Why hand-rolled rather than `prisma-field-encryption`:
 * - The library hooks Prisma's legacy `$use` middleware, which Prisma 7+ has
 *   actively deprecated in favour of `$extends`. This project pins Prisma 7.8
 *   and uses `@prisma/adapter-mariadb` (driver-adapter mode), and middleware
 *   compatibility with extended/driver-adapter clients has known sharp edges
 *   (silent passthroughs when middleware doesn't fire).
 * - The cost saved is ~50 LOC; the cost paid is one external dependency that
 *   can break across Prisma upgrades. Bad trade for this codebase.
 *
 * Envelope format: "v1.<iv-b64>.<tag-b64>.<ct-b64>". The "v1" prefix exists so
 * key-rotation can write a "v2" prefix during transition and the decrypt path
 * can keep handling old rows during the migration.
 */

import { Injectable, Logger } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm" as const;
const IV_BYTES = 12;
const KEY_BYTES = 32;
const ENVELOPE_VERSION = "v1" as const;

const PLACEHOLDER_KEY = "CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_BASE64_32";

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly key: Buffer;

  constructor() {
    const raw = process.env.REAL_DEMO_ENCRYPTION_KEY?.trim() ?? "";
    if (!raw) {
      throw new Error(
        "REAL_DEMO_ENCRYPTION_KEY is required. Generate one with `openssl rand -base64 32` and set it in the server environment.",
      );
    }
    if (raw === PLACEHOLDER_KEY) {
      this.logger.warn(
        "REAL_DEMO_ENCRYPTION_KEY is still the placeholder from .env.example — replace it before any non-dev deployment.",
      );
    }
    const decoded = Buffer.from(raw, "base64");
    if (decoded.length !== KEY_BYTES) {
      throw new Error(
        `REAL_DEMO_ENCRYPTION_KEY must decode to ${KEY_BYTES} raw bytes (received ${decoded.length}). Generate a fresh one with \`openssl rand -base64 32\`.`,
      );
    }
    this.key = decoded;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      ENVELOPE_VERSION,
      iv.toString("base64"),
      tag.toString("base64"),
      ciphertext.toString("base64"),
    ].join(".");
  }

  decrypt(envelope: string): string {
    const parts = envelope.split(".");
    if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) {
      throw new Error(
        `Unrecognised cipher envelope (expected "${ENVELOPE_VERSION}.<iv>.<tag>.<ct>").`,
      );
    }
    const [, ivPart, tagPart, ctPart] = parts as [string, string, string, string];
    const iv = Buffer.from(ivPart, "base64");
    const tag = Buffer.from(tagPart, "base64");
    const ciphertext = Buffer.from(ctPart, "base64");
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  }

  /**
   * Produce a non-sensitive preview of a key for display in lists / tables.
   *
   * Shows the *prefix* (e.g. `sk-proj`, `xai-`) rather than the trailing
   * characters: the trailing 3-4 chars of an opaque secret carry ~20 bits of
   * entropy and are routinely used as a side-channel identifier in logs /
   * screen-shares. The prefix is part of the well-known scheme name and adds
   * no exploitable entropy.
   */
  preview(plaintext: string): string {
    const trimmed = plaintext.trim();
    if (trimmed.length === 0) return "";
    if (trimmed.length <= 6) return "•".repeat(trimmed.length);
    // Take up to the first dash plus a couple of chars after it; fall back to
    // the first 6 chars for keys with no recognisable prefix.
    const dashIdx = trimmed.indexOf("-");
    const cut =
      dashIdx > 0 && dashIdx < 12 ? Math.min(dashIdx + 3, trimmed.length - 4) : 6;
    const head = trimmed.slice(0, cut);
    return `${head}••••`;
  }
}
