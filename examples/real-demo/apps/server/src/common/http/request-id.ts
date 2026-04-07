import { createRequestId } from "@real-demo/shared";

interface HeaderLikeRequest {
  headers: Record<string, string | string[] | undefined>;
  requestId?: string;
}

export interface RequestWithRequestId extends HeaderLikeRequest {
  method?: string;
  originalUrl?: string;
  url?: string;
}

const readRequestIdHeader = (request: HeaderLikeRequest) => {
  const requestIdHeader = request.headers["x-request-id"];

  if (typeof requestIdHeader === "string" && requestIdHeader.length > 0) {
    return requestIdHeader;
  }

  if (Array.isArray(requestIdHeader) && typeof requestIdHeader[0] === "string") {
    return requestIdHeader[0];
  }

  return undefined;
};

export const getOrCreateRequestId = (request: RequestWithRequestId) => {
  if (request.requestId) {
    return request.requestId;
  }

  const requestId = readRequestIdHeader(request) ?? createRequestId();
  request.requestId = requestId;

  return requestId;
};
