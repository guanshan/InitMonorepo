import { UserDetailPage } from "../../pages/user-detail/UserDetailPage";

import { buildRouteMeta, routeMetaCopy } from "../route-meta";

export const meta = () => buildRouteMeta(routeMetaCopy.userDetail);

export default function UserDetailRoute() {
  return <UserDetailPage />;
}
