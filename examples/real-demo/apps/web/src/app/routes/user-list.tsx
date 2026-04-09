import { UserListPage } from "../../pages/user-list/UserListPage";

import { buildRouteMeta, routeMetaCopy } from "../route-meta";

export const meta = () => buildRouteMeta(routeMetaCopy.users);

export default function UserListRoute() {
  return <UserListPage />;
}
