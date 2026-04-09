import { NotFoundPage } from "../../pages/not-found/NotFoundPage";

import { buildRouteMeta, routeMetaCopy } from "../route-meta";

export const meta = () => buildRouteMeta(routeMetaCopy.notFound);

export default function NotFoundRoute() {
  return <NotFoundPage />;
}
