export const REALTIME_VERSION = "1";

export const REALTIME_EVENT_TYPES = {
  taskCreated: "task.created",
  taskUpdated: "task.updated",
  taskDeleted: "task.deleted",
  taskRestored: "task.restored",
  projectCreated: "project.created",
  projectUpdated: "project.updated",
  projectDeleted: "project.deleted",
  sprintCreated: "sprint.created",
  sprintUpdated: "sprint.updated",
  sprintDeleted: "sprint.deleted",
} as const;

export type RealtimeEventType =
  (typeof REALTIME_EVENT_TYPES)[keyof typeof REALTIME_EVENT_TYPES];

export interface RealtimeEventEnvelope<TData = Record<string, unknown>> {
  version: typeof REALTIME_VERSION;
  type: RealtimeEventType;
  eventId: string;
  organizationId: string;
  projectId?: string;
  actorId: string;
  timestamp: string;
  idempotencyKey: string;
  data: TData;
}
