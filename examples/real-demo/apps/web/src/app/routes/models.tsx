import { ModelsPage } from "../../pages/models/ModelsPage";
import { RequireRole } from "../../shared/ui/RequireRole";

import { buildRouteMeta, routeMetaCopy } from "../route-meta";

export const meta = () => buildRouteMeta(routeMetaCopy.models);

export default function ModelsRoute() {
  return (
    <RequireRole roles={["ADMIN", "SUPER_ADMIN"]}>
      <ModelsPage />
    </RequireRole>
  );
}
