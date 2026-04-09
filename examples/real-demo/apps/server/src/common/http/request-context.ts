import { AsyncLocalStorage } from "node:async_hooks";

interface RequestContext {
  requestId: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export const runWithRequestContext = <T>(
  context: RequestContext,
  callback: () => T,
) => requestContextStorage.run(context, callback);

export const getRequestContext = () => requestContextStorage.getStore();
