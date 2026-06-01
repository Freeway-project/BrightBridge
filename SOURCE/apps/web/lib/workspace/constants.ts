export type ChecklistSection = {
  title: string
  items: { id: string; label: string }[]
}

export const CHECKLIST: ChecklistSection[] = [
  {
    title: "A. Course Shell & Navigation",
    items: [
      { id: "A1", label: "Course banner / hero image present and correctly sized" },
      { id: "A2", label: "Navigation bar matches Brightspace standard template" },
      { id: "A3", label: "Welcome page with instructor intro and course overview" },
      { id: "A4", label: "Module folders follow naming convention" },
    ],
  },
  {
    title: "B. Pages & Files",
    items: [
      { id: "B1", label: "All page content readable and correctly formatted" },
      { id: "B2", label: "Files accessible (no broken download links)" },
      { id: "B3", label: "Images have alt text" },
      { id: "B4", label: "No Moodle-specific UI artifacts visible" },
    ],
  },
  {
    title: "C. Links & Embedded Content",
    items: [
      { id: "C1", label: "All hyperlinks resolve (no 404s)" },
      { id: "C2", label: "Embedded videos play correctly" },
      { id: "C3", label: "External tools (Turnitin, Echo360, etc.) configured" },
    ],
  },
]

export const ITEM_LABELS: Record<string, string> = Object.fromEntries(
  CHECKLIST.flatMap((s) => s.items.map((i) => [i.id, i.label]))
)

export const SYLLABUS_ITEMS_LIST = [
  { id: "S1", label: "Instructor contact and office hours are current" },
  { id: "S2", label: "Course schedule matches Brightspace modules" },
  { id: "S3", label: "Assessment weights match gradebook categories" },
  { id: "S4", label: "Academic integrity and accessibility statements are present" },
]

export const GRADEBOOK_ITEMS_LIST = [
  { id: "G1", label: "Grade categories match syllabus weighting" },
  { id: "G2", label: "Calculated final grade is configured" },
  { id: "G3", label: "Hidden columns are intentional" },
  { id: "G4", label: "Release conditions and due dates are correct" },
]

export const SYLLABUS_ITEM_LABELS: Record<string, string> = Object.fromEntries(
  SYLLABUS_ITEMS_LIST.map((i) => [i.id, i.label])
)

export const GRADEBOOK_ITEM_LABELS: Record<string, string> = Object.fromEntries(
  GRADEBOOK_ITEMS_LIST.map((i) => [i.id, i.label])
)
