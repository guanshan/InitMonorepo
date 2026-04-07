export const createRequestId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }

  return `req_${Math.random().toString(36).slice(2, 10)}`;
};
