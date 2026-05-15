import { PlaygroundPage } from "../../pages/playground/PlaygroundPage";
import { RequireRole } from "../../shared/ui/RequireRole";

import { buildRouteMeta, routeMetaCopy } from "../route-meta";

export const meta = () => buildRouteMeta(routeMetaCopy.playground);

export default function PlaygroundRoute() {
  return (
    <RequireRole roles={["ADMIN", "SUPER_ADMIN"]}>
      <PlaygroundPage />
    </RequireRole>
  );
}
