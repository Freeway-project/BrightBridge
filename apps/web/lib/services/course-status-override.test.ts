import { describe, expect, it } from "vitest";
import { overrideCourseStatus } from "./course-status-override";

function makeClient(overrides: Partial<{
  selectStatus: string;
  insertError: unknown;
  updateError: unknown;
}> = {}) {
  const inserts: unknown[] = [];
  const updates: unknown[] = [];
  const client = {
    from(table: string) {
      if (table === "courses") {
        return {
          select() {
            return {
              eq() {
                return {
                  single: async () => ({ data: { status: overrides.selectStatus ?? "submitted_to_admin" }, error: null }),
                };
              },
            };
          },
          update(payload: unknown) {
            return {
              eq() {
                updates.push(payload);
                return Promise.resolve({ error: overrides.updateError ?? null });
              },
            };
          },
        };
      }
      if (table === "course_status_events") {
        return {
          insert(payload: unknown) {
            inserts.push(payload);
            return Promise.resolve({ error: overrides.insertError ?? null });
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
  return { client, inserts, updates };
}

describe("overrideCourseStatus", () => {
  it("inserts an admin_override event and updates courses.status", async () => {
    const { client, inserts, updates } = makeClient({ selectStatus: "submitted_to_admin" });
    await overrideCourseStatus(client as never, {
      courseId: "c1",
      to: "ta_review_in_progress",
      reason: "Reverting to fix metadata",
      actorId: "u1",
      actorRole: "admin_full",
    });
    expect(inserts).toEqual([
      {
        course_id: "c1",
        from_status: "submitted_to_admin",
        to_status: "ta_review_in_progress",
        actor_id: "u1",
        actor_role: "admin_full",
        note: "Reverting to fix metadata",
        kind: "admin_override",
      },
    ]);
    expect(updates).toEqual([{ status: "ta_review_in_progress" }]);
  });

  it("rejects when target equals current status", async () => {
    const { client } = makeClient({ selectStatus: "submitted_to_admin" });
    await expect(
      overrideCourseStatus(client as never, {
        courseId: "c1",
        to: "submitted_to_admin",
        reason: "Reverting to fix metadata",
        actorId: "u1",
        actorRole: "admin_full",
      }),
    ).rejects.toThrow(/already/i);
  });

  it("rejects when reason is shorter than 10 chars after trim", async () => {
    const { client } = makeClient();
    await expect(
      overrideCourseStatus(client as never, {
        courseId: "c1",
        to: "ta_review_in_progress",
        reason: "   short   ",
        actorId: "u1",
        actorRole: "admin_full",
      }),
    ).rejects.toThrow(/reason/i);
  });

  it("rejects when actor role is not allowed", async () => {
    const { client } = makeClient();
    await expect(
      overrideCourseStatus(client as never, {
        courseId: "c1",
        to: "ta_review_in_progress",
        reason: "Reverting to fix metadata",
        actorId: "u1",
        actorRole: "admin_viewer" as never,
      }),
    ).rejects.toThrow(/forbidden/i);
  });
});
