# Logging Guidelines

- HTTP logs should emit structured JSON with `timestamp`, `level`, `service`, `module`, `action`, `requestId`, and `message`.
- HTTP logs should include a request id.
- Cache hits should be visible through structured metadata rather than ad hoc console output.
- Domain errors should map to explicit HTTP exceptions with stable error codes.
- Sensitive request headers such as `authorization` and `cookie` must be redacted.
