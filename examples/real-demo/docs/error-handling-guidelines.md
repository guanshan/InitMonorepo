# Error Handling Guidelines

- Backend controllers return unified success envelopes and rely on the global exception filter for unified error envelopes.
- Infrastructure-specific failures should be translated before they leak into higher layers, for example Prisma uniqueness errors becoming domain-level duplication errors.
- The generated SDK throws `ApiRequestError` with HTTP status and error code metadata.
- TanStack Query handles request failures centrally so pages do not duplicate toast, network, or redirect behavior.
