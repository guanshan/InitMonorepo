# Security Guidelines

- CORS remains environment-driven and should stay disabled for unrelated origins in same-origin deployments.
- The server sets baseline response headers such as `Referrer-Policy`, `X-Content-Type-Options`, and `X-Frame-Options`.
- Proxy-aware features such as request IP logging and write rate limiting rely on `TRUST_PROXY`. The default is `false` (trust nothing); set it explicitly to match the real ingress chain.
- Request logging must never include credentials, secrets, or connection strings.
- Keep cache namespaces explicit so future auth, session, and rate-limit work can evolve without accidental key collisions.
