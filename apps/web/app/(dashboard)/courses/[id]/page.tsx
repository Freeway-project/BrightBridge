import { notFound } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { requireProfile } from "@/lib/auth/context"
import { getCourseById } from "@/lib/services/courses"
import { getReviewResponse, getReviewSectionByKey } from "@/lib/services/review"
import { getChangeRequestHistory } from "@/lib/courses/service"
import { getFinalSummaryNotes } from "@/lib/courses/final-summary"
import { getIssuesForCourseAction } from "@/lib/issues"
import { CHECKLIST, SYLLABUS_ITEMS_LIST, GRADEBOOK_ITEMS_LIST } from "@/lib/workspace/constants"
import type {
  MetadataFormValues,
  ReviewMatrixFormValues,
  SyllabusGradebookFormValues,
} from "@/lib/workspace/schemas"
import type { IssueLogResponseData } from "@/lib/workspace/types"
import { CourseWorkspaceRefreshWrapper } from "../_components/course-workspace-refresh-wrapper"
import { MetadataForm } from "./_components/metadata-form"
import { ReviewMatrixForm } from "./_components/review-matrix-form"
import { SyllabusGradebookForm } from "./_components/syllabus-gradebook-form"
import { IssueTracker } from "./_components/issues/issue-tracker"
import { SubmitPanel } from "./_components/submit-panel"
import { FinalSummaryEditor } from "@/components/shared/final-summary-editor"
import { WorkspaceSection } from "./_components/workspace-section"

interface Props {
  params: Promise<{ id: string }>
}

const ALL_ITEM_IDS = CHECKLIST.flatMap((s) => s.items.map((i) => i.id))
const SYLLABUS_IDS = SYLLABUS_ITEMS_LIST.map((i) => i.id)
const GRADEBOOK_IDS = GRADEBOOK_ITEMS_LIST.map((i) => i.id)
const SUMMARY_EDITABLE_STATUSES = ["waiting_on_admin", "staging_in_progress"]
const ADMIN_ROLES = ["admin_full", "admin_viewer", "super_admin"]

const TERM_CODE_SEASONS: Record<string, string> = {
  "10": "Winter", "11": "Winter", "20": "Summer", "21": "Spring",
  "22": "Summer", "30": "Fall", "31": "Fall",
}

function getCourseSubject(sourceCourseId: string | null): string {
  return sourceCourseId?.trim().match(/^([A-Za-z]+)/)?.[1]?.toUpperCase() ?? ""
}

function parseTermContext(term: string | null): { season: string; year: string } {
  const normalized = term?.trim() ?? ""
  const compact = normalized.match(/^(\d{4})(\d{2})$/)
  if (compact) {
    return { year: compact[1] ?? "", season: TERM_CODE_SEASONS[compact[2] ?? ""] ?? "" }
  }
  const parts = normalized.split(/\s+/).filter(Boolean)
  if (parts.length === 2) {
    const [first, second] = parts
    if (/^\d{4}$/.test(first ?? "")) return { year: first ?? "", season: second ?? "" }
    return { season: first ?? "", year: second ?? "" }
  }
  return { season: "", year: "" }
}

export default async function CourseWorkspacePage({ params }: Props) {
  const { id } = await params
  const ctx = await requireProfile()
  const course = await getCourseById(id, ctx.userId, ctx.profile.role)
  if (!course) notFound()

  const [
    metadataSection,
    matrixSection,
    issueSection,
    syllabusSection,
    issues,
    summaryNotes,
    changeRequests,
  ] = await Promise.all([
    getReviewSectionByKey("course_metadata"),
    getReviewSectionByKey("review_matrix"),
    getReviewSectionByKey("general_notes"),
    getReviewSectionByKey("syllabus_review"),
    getIssuesForCourseAction(id, { phase: "migration" }),
    getFinalSummaryNotes(id),
    course.status === "admin_changes_requested" ? getChangeRequestHistory(id) : Promise.resolve([]),
  ])

  const [metadataResponse, matrixResponse, issueResponse, syllabusResponse] = await Promise.all([
    metadataSection ? getReviewResponse(id, metadataSection.id) : null,
    matrixSection ? getReviewResponse(id, matrixSection.id) : null,
    issueSection ? getReviewResponse(id, issueSection.id) : null,
    syllabusSection ? getReviewResponse(id, syllabusSection.id) : null,
  ])

  // ── Metadata defaults ──
  const metadataDefaults: MetadataFormValues = {
    term: "", section_numbers: [],
    migration_notes: "", overall_time_spent_seconds: 0,
    ...((metadataResponse?.response_data ?? {}) as Partial<MetadataFormValues>),
  }

  // ── Review matrix defaults ──
  const matrixSaved = (matrixResponse?.response_data as Partial<ReviewMatrixFormValues> | null) ?? {}
  const matrixItemMap = Object.fromEntries((matrixSaved.items ?? []).map((i) => [i.item_id, i]))
  const termContext = parseTermContext(course.term)
  const matrixDefaults: ReviewMatrixFormValues = {
    subject: matrixSaved.subject ?? getCourseSubject(course.sourceCourseId),
    season: matrixSaved.season ?? termContext.season,
    year: matrixSaved.year ?? termContext.year,
    items: ALL_ITEM_IDS.map((item_id) => ({
      item_id,
      status: matrixItemMap[item_id]?.status ?? "na",
      notes: matrixItemMap[item_id]?.notes ?? "",
      direct_link: matrixItemMap[item_id]?.direct_link ?? "",
    })),
    time_spent_seconds: matrixSaved.time_spent_seconds ?? 0,
    overall_time_spent_seconds: matrixSaved.overall_time_spent_seconds ?? 0,
  }
  const initialIssues = ((issueResponse?.response_data as Partial<IssueLogResponseData> | null)?.issues ?? [])

  // ── Syllabus & gradebook defaults ──
  const syllabusSaved = (syllabusResponse?.response_data ?? {}) as Partial<SyllabusGradebookFormValues>
  const syllabusDefaults: SyllabusGradebookFormValues = {
    instructor_id: syllabusSaved.instructor_id ?? "",
    instructor_email: syllabusSaved.instructor_email ?? "",
    syllabus_items: SYLLABUS_IDS.map((item_id) => {
      const found = syllabusSaved.syllabus_items?.find((i) => i.item_id === item_id)
      return { item_id, ta_status: found?.ta_status ?? "pending", notes: found?.notes ?? "", direct_link: found?.direct_link ?? "" }
    }),
    gradebook_items: GRADEBOOK_IDS.map((item_id) => {
      const found = syllabusSaved.gradebook_items?.find((i) => i.item_id === item_id)
      return { item_id, status: found?.status ?? "na", notes: found?.notes ?? "", direct_link: found?.direct_link ?? "" }
    }),
    time_spent_seconds: syllabusSaved.time_spent_seconds ?? 0,
    overall_time_spent_seconds: syllabusSaved.overall_time_spent_seconds ?? 0,
  }

  // ── Submit panel data ──
  const summaryEditable =
    SUMMARY_EDITABLE_STATUSES.includes(course.status) &&
    (ctx.profile.role === "standard_user" || ADMIN_ROLES.includes(ctx.profile.role))

  const metadataComplete = Boolean(metadataResponse && Object.keys(metadataResponse.response_data ?? {}).length > 0)
  const matrixComplete = Boolean(matrixResponse && Object.keys(matrixResponse.response_data ?? {}).length > 0)
  const syllabusComplete = Boolean(syllabusResponse && Object.keys(syllabusResponse.response_data ?? {}).length > 0)
  const submitSections = [
    { key: "course_metadata", label: "Metadata", required: false, complete: metadataComplete },
    { key: "review_matrix", label: "Review Matrix", required: false, complete: matrixComplete },
    { key: "syllabus_review", label: "Syllabus & Gradebook", required: false, complete: syllabusComplete },
    { key: "issues", label: "Issues", required: false, complete: issues.length === 0 },
  ]
  const latestChangeRequest = changeRequests[changeRequests.length - 1] ?? null
  const reviewData = {
    course: { id: course.id, code: course.sourceCourseId || "", title: course.title },
    issues: issues.map((issue) => ({
      id: issue.id,
      type: issue.type || "general",
      severity: (issue.severity || "minor") as "minor" | "major" | "critical",
      status: (issue.status || "open") as "open" | "fixed" | "escalated" | "resolved",
    })),
  }

  const base = `/courses/${id}`

  return (
    <>
      <Topbar title="Course Workspace" subtitle="Full review — all sections" courseStatus={course.status} role={ctx.profile.role} />
      <main className="flex-1 overflow-y-auto p-6">
        <CourseWorkspaceRefreshWrapper courseId={id} title="Course Review">
          <div className="space-y-16 pb-24">
            <WorkspaceSection id="section-metadata" step={1} title="Metadata" subtitle="Course info" fullViewHref={`${base}/metadata`}>
              <MetadataForm
                course={course}
                reviewerName={ctx.profile.fullName ?? ctx.email ?? ""}
                defaultValues={metadataDefaults}
                embedded
              />
            </WorkspaceSection>

            <WorkspaceSection id="section-review-matrix" step={2} title="Review Matrix" subtitle="Checklist items" fullViewHref={`${base}/review-matrix`}>
              <ReviewMatrixForm courseId={id} defaultValues={matrixDefaults} initialIssues={initialIssues} embedded />
            </WorkspaceSection>

            <WorkspaceSection id="section-syllabus-gradebook" step={3} title="Syllabus & Gradebook" subtitle="Docs review" fullViewHref={`${base}/syllabus-gradebook`}>
              <SyllabusGradebookForm courseId={id} defaultValues={syllabusDefaults} embedded />
            </WorkspaceSection>

            <WorkspaceSection id="section-issue-log" step={4} title="Issues" subtitle="Track problems" fullViewHref={`${base}/issue-log`}>
              <div className="mx-auto max-w-3xl space-y-[var(--card-spacing,1.5rem)] px-4 sm:px-6 lg:px-8">
                <FinalSummaryEditor courseId={id} initialNotes={summaryNotes} editable={summaryEditable} />
                <IssueTracker courseId={id} phase="migration" userRole={ctx.profile.role} courseStatus={course.status} />
              </div>
            </WorkspaceSection>

            <WorkspaceSection id="section-submit" step={5} title="Submit" subtitle="Final review" fullViewHref={`${base}/submit`}>
              <SubmitPanel
                courseId={course.id}
                courseStatus={course.status}
                sections={submitSections}
                reviewData={reviewData}
                latestChangeRequest={latestChangeRequest}
                instructorNotes={summaryNotes}
              />
            </WorkspaceSection>
          </div>
        </CourseWorkspaceRefreshWrapper>
      </main>
    </>
  )
}
