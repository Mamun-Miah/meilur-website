import { db } from "./db";

export async function logActivity(
  userId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  summary: string,
) {
  await db.activityLog.create({ data: { userId, action, entity, entityId, summary: summary.slice(0, 500) } });
}
