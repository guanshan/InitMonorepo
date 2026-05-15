import { UsersPage } from "../../pages/users/UsersPage";
import { RequireRole } from "../../shared/ui/RequireRole";

import { buildRouteMeta, routeMetaCopy } from "../route-meta";

export const meta = () => buildRouteMeta(routeMetaCopy.users);

export default function UsersRoute() {
  return (
    <RequireRole roles={["SUPER_ADMIN"]}>
      <UsersPage />
    </RequireRole>
  );
}
