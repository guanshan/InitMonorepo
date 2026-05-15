/**
 * Prisma surfaces well-known errors with a stable `code` ("P2002" for unique
 * violation, "P2025" for record-not-found). The driver-adapter and the
 * standard client both emit the same shape, but the public types live in
 * `@prisma/client/runtime/library` — importing them couples every consumer to
 * the runtime path. These predicates do a structural check instead.
 */

const hasCode = (err: unknown, code: string): boolean =>
  typeof err === "object" &&
  err !== null &&
  "code" in err &&
  (err as { code?: unknown }).code === code;

export const isPrismaUniqueViolation = (err: unknown): boolean =>
  hasCode(err, "P2002");

export const isPrismaRecordNotFound = (err: unknown): boolean =>
  hasCode(err, "P2025");

/**
 * For a P2002 unique-constraint violation, returns the list of column /
 * constraint names that hit. Lets callers distinguish *which* unique key
 * raced (e.g. email vs username) and pick a tailored 409 message instead of
 * a generic one.
 */
export const getPrismaUniqueViolationTargets = (err: unknown): string[] => {
  if (!isPrismaUniqueViolation(err)) return [];
  const meta = (err as { meta?: { target?: unknown } }).meta;
  if (!meta || typeof meta !== "object") return [];
  const target = meta.target;
  if (typeof target === "string") return [target];
  if (Array.isArray(target)) {
    return target.filter((entry): entry is string => typeof entry === "string");
  }
  return [];
};
