import { eq } from "drizzle-orm";
import { isPlatformAdministrator } from "../../shared/rbac.js";
import type { ControllerDatabase } from "../db/client.js";
import { user } from "../db/schema.js";
import { ControllerError } from "../domain/errors.js";

/** Also enforce the platform boundary for direct service/CLI callers. */
export async function assertPlatformActor(db: Pick<ControllerDatabase, "select">, actorId: string): Promise<void> {
  const [actor] = await db.select({ role: user.role }).from(user).where(eq(user.id, actorId));
  if (!isPlatformAdministrator(actor?.role)) throw new ControllerError("Only platform administrators may manage Default releases.", 403, "forbidden");
}
