const encodeCacheSegment = (value: string) => encodeURIComponent(value.trim());

export const cacheKeys = {
  auth: {
    sessionById: (sessionId: string) => `auth:session:${encodeCacheSegment(sessionId)}`,
  },
  entity: {
    userById: (userId: string) => `entity:user:${encodeCacheSegment(userId)}`,
  },
  query: {
    usersList: () => "query:users:list",
  },
  rateLimit: {
    byIp: (ipAddress: string) => `rate-limit:ip:${encodeCacheSegment(ipAddress)}`,
  },
} as const;
