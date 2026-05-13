import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

import { Injectable } from "@nestjs/common";

const SCRYPT_PARAMS = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64,
  maxmem: 64 * 1024 * 1024,
} as const;

const deriveScryptKey = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      SCRYPT_PARAMS.dkLen,
      {
        N: SCRYPT_PARAMS.N,
        r: SCRYPT_PARAMS.r,
        p: SCRYPT_PARAMS.p,
        maxmem: SCRYPT_PARAMS.maxmem,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey as Buffer);
      },
    );
  });

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const normalized = password.normalize("NFKC");
    const salt = randomBytes(16).toString("hex");
    const derivedKey = await deriveScryptKey(normalized, salt);
    return `${salt}:${derivedKey.toString("hex")}`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const [salt, storedKey] = hash.split(":");
    if (!salt || !storedKey) {
      return false;
    }

    const normalized = password.normalize("NFKC");
    const derivedKey = await deriveScryptKey(normalized, salt);

    const storedBuffer = Buffer.from(storedKey, "hex");
    return (
      derivedKey.length === storedBuffer.length &&
      timingSafeEqual(derivedKey, storedBuffer)
    );
  }
}
