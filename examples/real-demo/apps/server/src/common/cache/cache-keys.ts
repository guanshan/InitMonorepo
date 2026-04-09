const encodeCacheSegment = (value: string) => encodeURIComponent(value.trim());

export const cacheKeys = {
  auth: {
    sessionById: (sessionId: string) =>
      `auth:session:${encodeCacheSegment(sessionId)}`,
  },
  entity: {
    userById: (userId: string) => `entity:user:${encodeCacheSegment(userId)}`,
  },
  query: {
    usersListPage: (version: number, page: number, pageSize: number) =>
      `query:users:list:v${version}:page:${page}:page-size:${pageSize}`,
    usersListVersion: () => "query:users:list:version",
  },
  rateLimit: {
    byIp: (ipAddress: string) =>
      `rate-limit:ip:${encodeCacheSegment(ipAddress)}`,
  },
} as const;
