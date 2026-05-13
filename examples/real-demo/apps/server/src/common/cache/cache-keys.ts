const encodeCacheSegment = (value: string) => encodeURIComponent(value.trim());

export const cacheKeys = {
  auth: {
    sessionById: (sessionId: string) =>
      `auth:session:${encodeCacheSegment(sessionId)}`,
    captchaById: (captchaId: string) =>
      `auth:captcha:${encodeCacheSegment(captchaId)}`,
  },
  rateLimit: {
    byIp: (ipAddress: string) =>
      `rate-limit:ip:${encodeCacheSegment(ipAddress)}`,
  },
} as const;
