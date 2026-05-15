import { ProvidersPage } from "../../pages/providers/ProvidersPage";
import { RequireRole } from "../../shared/ui/RequireRole";

import { buildRouteMeta, routeMetaCopy } from "../route-meta";

export const meta = () => buildRouteMeta(routeMetaCopy.providers);

export default function ProvidersRoute() {
  return (
    <RequireRole roles={["ADMIN", "SUPER_ADMIN"]}>
      <ProvidersPage />
    </RequireRole>
  );
}
