/**
 * Strip anything that *looks* like an API key from a string before it ends up
 * in a log, a DB column, or an error message handed back to the client. The
 * patterns are tuned for the providers this demo ships with (OpenAI, Anthropic,
 * generic Bearer tokens) but the regex is deliberately broad: any long-ish
 * base32/64 run prefixed by `sk-`, `xai-`, `claude-`, `Bearer ` is masked.
 */

const PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9_-]{16,}/g,
  /xai-[A-Za-z0-9_-]{16,}/g,
  /claude-[A-Za-z0-9_-]{16,}/g,
  /Bearer\s+[A-Za-z0-9._-]{16,}/gi,
  /x-api-key:\s*[A-Za-z0-9._-]{16,}/gi,
];

export const redactSecrets = (input: string): string => {
  let out = input;
  for (const pattern of PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
};
