import { SettingsPage } from "../../pages/settings/SettingsPage";
import { RequireRole } from "../../shared/ui/RequireRole";

import { buildRouteMeta, routeMetaCopy } from "../route-meta";

export const meta = () => buildRouteMeta(routeMetaCopy.settings);

export default function SettingsRoute() {
  return (
    <RequireRole roles={["ADMIN", "SUPER_ADMIN"]}>
      <SettingsPage />
    </RequireRole>
  );
}
