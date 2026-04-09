import { HomePage } from "../../pages/home/HomePage";

import { buildRouteMeta, routeMetaCopy } from "../route-meta";

export const meta = () => buildRouteMeta(routeMetaCopy.home);

export default function HomeRoute() {
  return <HomePage />;
}
