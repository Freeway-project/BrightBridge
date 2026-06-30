import {
  GitMerge,
  ShieldCheck,
  FileCheck,
  CheckCircle2,
  MessagesSquare,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

/** In-page anchor links rendered in the nav. */
export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#workflow" },
  { label: "Preview", href: "#preview" },
] as const;

export type Feature = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

/** The capability grid. Keep copy honest to what the platform actually does. */
export const FEATURES: Feature[] = [
  {
    icon: GitMerge,
    title: "Structured migration reviews",
    desc: "Step-by-step TA checklists for every Moodle → Brightspace course, so nothing slips through.",
  },
  {
    icon: ShieldCheck,
    title: "Controlled role access",
    desc: "Super admins manage account creation and role changes centrally with app-layer permissions.",
  },
  {
    icon: CheckCircle2,
    title: "Staged approval",
    desc: "Multi-level sign-off from TA to instructor to department head to dean — in order, on the record.",
  },
  {
    icon: FileCheck,
    title: "Full audit trail",
    desc: "Every workflow handoff and decision stays tied to the course record for the life of the migration.",
  },
  {
    icon: MessagesSquare,
    title: "Reviewers stay in sync",
    desc: "Built-in chat and notifications keep TAs and instructors aligned without leaving the workspace.",
  },
  {
    icon: LayoutDashboard,
    title: "Progress at a glance",
    desc: "Dashboards track every course through the pipeline so leads always know what's left.",
  },
];

export type WorkflowStep = {
  n: string;
  title: string;
  desc: string;
};

/** The migration pipeline, told as four plain-language steps. */
export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    n: "01",
    title: "Import courses",
    desc: "Every Moodle course lands in one shared review queue, assigned and ready to go.",
  },
  {
    n: "02",
    title: "TA review",
    desc: "TAs work through a structured checklist per course and flag anything that needs attention.",
  },
  {
    n: "03",
    title: "Staged approval",
    desc: "Instructors, department heads, and deans sign off in sequence — each step recorded.",
  },
  {
    n: "04",
    title: "Live in Brightspace",
    desc: "Approved courses are published with a complete, auditable history behind them.",
  },
];
