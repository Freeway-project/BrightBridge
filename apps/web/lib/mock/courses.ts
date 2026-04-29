import type { CourseStatus } from "@coursebridge/workflow"

export interface MockCourse {
  id: string
  code: string
  title: string
  term: string
  section: string
  status: CourseStatus
  assignedDate: string
  instructor: string
  timeSpent: string
  issueCount: number
}

export const MOCK_COURSES: MockCourse[] = [
  {
    id: "c-001",
    code: "CS 101",
    title: "Introduction to Computing",
    term: "Fall 2025",
    section: "001",
    status: "ta_review_in_progress",
    assignedDate: "2025-08-12",
    instructor: "Dr. Patel",
    timeSpent: "2h 14m",
    issueCount: 3,
  },
  {
    id: "c-002",
    code: "ENGL 220",
    title: "Technical Writing",
    term: "Fall 2025",
    section: "002",
    status: "assigned_to_ta",
    assignedDate: "2025-08-14",
    instructor: "Prof. Nguyen",
    timeSpent: "0h 00m",
    issueCount: 0,
  },
  {
    id: "c-003",
    code: "MATH 301",
    title: "Calculus III",
    term: "Fall 2025",
    section: "001",
    status: "submitted_to_admin",
    assignedDate: "2025-08-08",
    instructor: "Dr. Kim",
    timeSpent: "4h 32m",
    issueCount: 1,
  },
  {
    id: "c-004",
    code: "BIO 210",
    title: "Cell Biology",
    term: "Fall 2025",
    section: "003",
    status: "admin_changes_requested",
    assignedDate: "2025-08-05",
    instructor: "Dr. Torres",
    timeSpent: "3h 10m",
    issueCount: 5,
  },
  {
    id: "c-005",
    code: "HIST 110",
    title: "World History to 1500",
    term: "Fall 2025",
    section: "001",
    status: "ta_review_in_progress",
    assignedDate: "2025-08-13",
    instructor: "Prof. Davis",
    timeSpent: "1h 05m",
    issueCount: 2,
  },
  {
    id: "c-006",
    code: "PHYS 201",
    title: "Physics for Engineers",
    term: "Fall 2025",
    section: "002",
    status: "assigned_to_ta",
    assignedDate: "2025-08-15",
    instructor: "Dr. Okafor",
    timeSpent: "0h 00m",
    issueCount: 0,
  },
]
