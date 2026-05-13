import { LoginPage } from "../../pages/login/LoginPage";

import { buildRouteMeta, routeMetaCopy } from "../route-meta";

export const meta = () => buildRouteMeta(routeMetaCopy.login);

export default function LoginRoute() {
  return <LoginPage />;
}
