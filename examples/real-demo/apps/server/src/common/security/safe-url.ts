/**
 * Defence-in-depth checks for an admin-supplied upstream URL.
 *
 * The provider / verify / discover / playground endpoints all eventually fetch
 * `provider.baseUrl`. Without validation, an admin-authenticated client (or
 * anyone who captures an admin session) can pivot the call at cloud-metadata
 * endpoints (`http://169.254.169.254/...`) or other internal infrastructure.
 *
 * The hostname check is applied twice:
 *
 *   1. At ingress — `validateUpstreamUrl` — when a provider is created or
 *      edited, and on every ad-hoc baseUrl in the discover/verify-before-save
 *      flow. Fast, no network round-trip.
 *
 *   2. Before each outbound fetch — `validateResolvedUpstreamHost` — DNS-
 *      resolves the hostname and rechecks every returned address. This catches
 *      attackers who registered `evil.example.com → 169.254.169.254` and
 *      tries to slip past the literal-IP check at ingress.
 *
 * Loopback / RFC 1918 are intentionally allowed at both layers because the
 * Ollama preset (and similar local proxies) depend on them. Tightening past
 * that requires a deployment-specific policy.
 *
 * Caveats:
 *   - These helpers only validate the URL handed to them. The discover flow
 *     uses `fetch` with `redirect: "manual"` and re-runs both checks on every
 *     Location hop (see ModelsService#fetchUpstreamWithSafeRedirects). Any
 *     new outbound call site must do the same — default fetch behavior is to
 *     transparently follow 3xx redirects, which would bypass this check.
 *   - The two checks together create a small TOCTOU window (DNS could change
 *     between resolve and connect). For this demo's threat model — admin
 *     authenticated, not adversarial DNS — that's acceptable.
 */
import { promises as dns } from "node:dns";

export const SAFE_URL_INVALID = "URL must be a valid http(s) endpoint." as const;
export const SAFE_URL_FORBIDDEN_HOST =
  "URL points at a forbidden host (cloud metadata or link-local)." as const;

const LINK_LOCAL_V4 = /^169\.254\./;
const ANY_V4 = /^0\.0\.0\.0$/;
const LINK_LOCAL_V6 = /^fe[89ab][0-9a-f]:/i;
const ANY_V6 = /^::$/;
// IPv4-mapped IPv6 forms: `::ffff:169.254.169.254` normalizes via the WHATWG
// URL parser to `::ffff:a9fe:a9fe`, so the v4 link-local check above never
// fires. Catch the normalized hex form, and the dotted-quad form for DNS-
// returned addresses that don't pass through URL parsing.
const IPV4_MAPPED_LINK_LOCAL_HEX = /^::ffff:a9fe:[0-9a-f]{1,4}$/i;
const IPV4_MAPPED_LINK_LOCAL_DOTTED = /^::ffff:169\.254\./i;
const IPV4_MAPPED_ANY = /^::ffff:0+:0+$|^::ffff:0\.0\.0\.0$/i;

const FORBIDDEN_HOSTNAMES = new Set([
  "metadata.google.internal",
  "metadata.azure.com",
]);

// `URL.hostname` returns IPv6 literals wrapped in brackets (`[fe80::1]`),
// which would never match the bare-address regexes below. Strip them before
// any pattern matching.
const stripIpv6Brackets = (host: string): string =>
  host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;

const isForbiddenAddress = (address: string): boolean => {
  const host = stripIpv6Brackets(address.toLowerCase());
  return (
    LINK_LOCAL_V4.test(host) ||
    ANY_V4.test(host) ||
    LINK_LOCAL_V6.test(host) ||
    ANY_V6.test(host) ||
    IPV4_MAPPED_LINK_LOCAL_HEX.test(host) ||
    IPV4_MAPPED_LINK_LOCAL_DOTTED.test(host) ||
    IPV4_MAPPED_ANY.test(host)
  );
};

export interface SafeUrlResult {
  ok: boolean;
  reason?: typeof SAFE_URL_INVALID | typeof SAFE_URL_FORBIDDEN_HOST;
}

/**
 * Cheap syntactic check. Use on data entry — provider create/update, and on
 * ad-hoc credential triples handed to the discover flow.
 */
export const validateUpstreamUrl = (raw: string): SafeUrlResult => {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false, reason: SAFE_URL_INVALID };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: SAFE_URL_INVALID };
  }
  const host = parsed.hostname.toLowerCase();
  if (FORBIDDEN_HOSTNAMES.has(host) || isForbiddenAddress(host)) {
    return { ok: false, reason: SAFE_URL_FORBIDDEN_HOST };
  }
  return { ok: true };
};

/**
 * Stricter, async check. Use immediately before any outbound fetch:
 * `verify`, `discover`, `runChat`, `runChatStream`. Resolves the hostname
 * and rejects if any A/AAAA record points at a forbidden range. Returns
 * silently on success.
 */
export const validateResolvedUpstreamHost = async (
  raw: string,
): Promise<SafeUrlResult> => {
  const syntactic = validateUpstreamUrl(raw);
  if (!syntactic.ok) return syntactic;

  const url = new URL(raw.trim());
  const hostname = url.hostname.toLowerCase();

  // Literal IPs were already covered by the syntactic check above — DNS
  // resolution would be meaningless for them. IPv6 literals arrive bracketed.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return { ok: true };
  if (hostname.startsWith("[") && hostname.endsWith("]")) return { ok: true };

  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    // DNS failures will surface as fetch errors anyway; don't pretend to
    // know more than the resolver.
    return { ok: true };
  }
  for (const { address } of addresses) {
    if (isForbiddenAddress(address)) {
      return { ok: false, reason: SAFE_URL_FORBIDDEN_HOST };
    }
  }
  return { ok: true };
};
