import { UserCreatePage } from "../../pages/user-create/UserCreatePage";

import { buildRouteMeta, routeMetaCopy } from "../route-meta";

export const meta = () => buildRouteMeta(routeMetaCopy.userCreate);

export default function UserCreateRoute() {
  return <UserCreatePage />;
}
