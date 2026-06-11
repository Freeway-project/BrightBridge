import "server-only";

export type InstructorDashboardView = {
  courseId: string;
  profileId: string;
  firstOpenedAt: string;
  lastOpenedAt: string;
  openCount: number;
};
