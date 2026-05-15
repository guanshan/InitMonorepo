/* eslint-disable no-console */
/**
 * Rotate the AES-256-GCM master key used by `CryptoService`.
 *
 * Usage:
 *   REAL_DEMO_ENCRYPTION_KEY=<old> REAL_DEMO_ENCRYPTION_KEY_NEXT=<new> \
 *     pnpm tsx apps/server/scripts/rotate-encryption-key.ts
 *
 * The script decrypts every provider row with the old key, re-encrypts with the
 * new key, and writes the new ciphertext back. Each UPDATE is guarded by an
 * optimistic match on the *original* ciphertext: if an admin edits a provider
 * between the read and the write, the UPDATE affects zero rows and the script
 * reports it as skipped instead of overwriting the fresher value with a stale
 * re-encryption.
 *
 * Both keys must be 32 raw bytes encoded as base64.
 * On success: swap the env var to the new key and restart the server.
 *
 * Exit code is non-zero if any row was skipped or failed; rerun the script
 * after resolving the conflicts before swapping the env var.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const ALGO = "aes-256-gcm" as const;
const IV_BYTES = 12;
const KEY_BYTES = 32;
const VERSION = "v1" as const;

const loadKey = (envName: string): Buffer => {
  const raw = process.env[envName]?.trim();
  if (!raw) {
    console.error(`${envName} is required.`);
    process.exit(1);
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== KEY_BYTES) {
    console.error(
      `${envName} must decode to ${KEY_BYTES} bytes (got ${buf.length}).`,
    );
    process.exit(1);
  }
  return buf;
};

const decrypt = (envelope: string, key: Buffer): string => {
  const parts = envelope.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error(`Unrecognised envelope: ${envelope.slice(0, 20)}…`);
  }
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const ct = Buffer.from(parts[3], "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
};

const encrypt = (plaintext: string, key: Buffer): string => {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    ct.toString("base64"),
  ].join(".");
};

const main = async () => {
  const oldKey = loadKey("REAL_DEMO_ENCRYPTION_KEY");
  const newKey = loadKey("REAL_DEMO_ENCRYPTION_KEY_NEXT");
  if (oldKey.equals(newKey)) {
    console.error("REAL_DEMO_ENCRYPTION_KEY and REAL_DEMO_ENCRYPTION_KEY_NEXT must differ.");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const adapter = new PrismaMariaDb(databaseUrl);
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  let rotated = 0;
  let skipped = 0;
  let failed = 0;
  try {
    const rows = await prisma.provider.findMany({
      select: { id: true, providerKey: true, apiKeyCipher: true },
    });
    console.log(`Rotating ${rows.length} provider rows…`);
    for (const row of rows) {
      try {
        const plaintext = decrypt(row.apiKeyCipher, oldKey);
        const reEncrypted = encrypt(plaintext, newKey);
        // Optimistic lock: only swap the ciphertext if the row STILL holds
        // the bytes we just decrypted. If an admin edited the row mid-flight
        // the WHERE matches zero rows and `updateMany` returns count=0; we
        // log it and the operator must rerun the script.
        const result = await prisma.provider.updateMany({
          where: { id: row.id, apiKeyCipher: row.apiKeyCipher },
          data: { apiKeyCipher: reEncrypted },
        });
        if (result.count === 1) {
          rotated += 1;
          console.log(`  ✓ ${row.providerKey}`);
        } else {
          skipped += 1;
          console.warn(
            `  ⚠ ${row.providerKey} — row changed during rotation, skipped. Rerun the script.`,
          );
        }
      } catch (err) {
        failed += 1;
        console.error(
          `  ✗ ${row.providerKey} — ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    console.log(
      `Rotation complete: ${rotated} rotated, ${skipped} skipped, ${failed} failed (of ${rows.length}).`,
    );
  } finally {
    await prisma.$disconnect();
  }

  if (skipped > 0 || failed > 0) {
    console.error(
      "Some rows did not rotate. Do NOT swap REAL_DEMO_ENCRYPTION_KEY until you rerun and reach 0 skipped / 0 failed.",
    );
    process.exit(2);
  }
};

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
