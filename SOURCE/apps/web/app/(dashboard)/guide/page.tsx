import { Topbar } from "@/components/layout/topbar"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { MermaidDiagram } from "@/components/shared/mermaid-diagram"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { BookOpen, UserCheck, ShieldCheck, GraduationCap, ArrowRight, CheckCircle2, Clock, AlertTriangle, Send, Server, Layers } from "lucide-react"

const WORKFLOW_DIAGRAMS: { title: string; description: string; chart: string }[] = [
  {
    title: "Big Picture",
    description: "The whole course journey, including the new staging phase.",
    chart: `flowchart TD
    A(["Course Created"]) --> B["Assigned to TA"]
    B --> C["TA Reviewing"]
    C --> D["Submitted to Admin"]
    D -->|Admin requests fixes| F["Changes Requested"]
    F -->|TA fixes & resubmits| C
    D -->|Admin approves| W["Waiting on Admin<br/>(builds staging shell)"]
    W -->|Shell ready, pushed to TA| SG["Staging in Process<br/>(TA finalizes + Issues Summary)"]
    SG -->|Course Complete / ready to send| E["Ready for Instructor"]
    E -->|Comms sends email| G["Sent to Instructor"]
    G -->|Instructor asks a question| H["Instructor Has Questions"]
    G -->|Instructor approves| I["Instructor Approved"]
    H -->|Admin/Comms responds & resends| G
    I -->|Admin gives final sign-off| J(["Final Approved"])

    classDef ta fill:#dbeafe,stroke:#2563eb,color:#1e3a8a;
    classDef admin fill:#dcfce7,stroke:#16a34a,color:#14532d;
    classDef comms fill:#fef9c3,stroke:#ca8a04,color:#713f12;
    classDef instr fill:#ffedd5,stroke:#ea580c,color:#7c2d12;
    classDef done fill:#e9d5ff,stroke:#9333ea,color:#581c87;
    classDef new fill:#fde68a,stroke:#d97706,color:#78350f;
    class B,C,D,F ta;
    class E admin;
    class G comms;
    class H,I instr;
    class A,J done;
    class W,SG new;`,
  },
  {
    title: "Staging Phase",
    description: "The new phase that sits between Admin approval and the Instructor handoff.",
    chart: `flowchart LR
    D(["Submitted to Admin"]) -->|Admin approves| W["Waiting on Admin<br/>admin builds the staging shell"]
    W -->|Shell ready, push back to TA| S["Staging in Process<br/>TA finalizes the course<br/>+ writes the Issues Summary"]
    S -->|"Course Complete / ready to send email"| R(["Ready for Instructor"])
    R -->|Comms or Admin sends the email| I(["Sent to Instructor"])

    note["Issues Summary box (Issues tab):<br/>editable by TA and Admin,<br/>finalized here, rides along to the instructor."]

    classDef new fill:#fde68a,stroke:#d97706,color:#78350f;
    classDef n fill:#f1f5f9,stroke:#64748b,color:#334155;
    class W,S new;
    class note n;`,
  },
  {
    title: "TA Journey",
    description: "First the review workspace, then the staging pass.",
    chart: `flowchart TD
    subgraph PASS1["First pass — Review"]
        S1["1. Course Info<br/>(term, links, notes)"] --> S2["2. Review Checklist<br/>(item-by-item checks)"]
        S2 --> S3["3. Syllabus & Grades<br/>(verify these moved correctly)"]
        S3 --> S4["4. Issues<br/>(log problems + Issues Summary box)"]
        S4 --> S5["5. Submit<br/>(send to Admin)"]
    end
    S5 --> OUT(["Submitted to Admin"])

    OUT -.->|Admin approves & builds staging shell| PASS2

    subgraph PASS2["Second pass — Staging in Process"]
        T1["TA finalizes the course in staging"] --> T2["TA updates the Issues Summary"]
        T2 --> T3["Mark Course Complete<br/>(ready to send email)"]
    end
    T3 --> RDY(["Ready for Instructor"])

    classDef ta fill:#dbeafe,stroke:#2563eb,color:#1e3a8a;
    classDef new fill:#fde68a,stroke:#d97706,color:#78350f;
    class S1,S2,S3,S4,S5 ta;
    class T1,T2,T3 new;`,
  },
  {
    title: "Admin Journey",
    description: "Review decision, then staging shell, then final sign-off.",
    chart: `flowchart TD
    IN["Course submitted by TA"] --> REVIEW{"Admin reviews<br/>the TA's work"}
    REVIEW -->|Needs work| FIX["Request Fixes<br/>(writes a note for the TA)"]
    FIX --> BACK["Goes back to TA"]
    REVIEW -->|Looks good| WAIT["Approve → Waiting on Admin"]
    WAIT --> SHELL["Admin builds the staging shell"]
    SHELL --> PUSH["Push back to TA → Staging in Process"]

    PUSH --> LATER["...TA finishes staging, instructor approves..."]
    LATER --> FINAL["Admin gives Final Sign-off"]

    extra["Admin also: assigns courses to TAs/instructors,<br/>sees the Overview dashboard, handles escalations,<br/>and can edit the Issues Summary."]

    classDef admin fill:#dcfce7,stroke:#16a34a,color:#14532d;
    classDef new fill:#fde68a,stroke:#d97706,color:#78350f;
    classDef n fill:#f1f5f9,stroke:#64748b,color:#334155;
    class REVIEW,APP,FIX,FINAL admin;
    class WAIT,SHELL,PUSH new;
    class extra n;`,
  },
  {
    title: "Communications Journey",
    description: "Hands the package to the instructor.",
    chart: `flowchart LR
    R(["Ready for Instructor"]) --> SEND["Comms reviews the package<br/>and sends it to the Instructor"]
    SEND --> S(["Sent to Instructor"])
    S -.->|If instructor asks a question| Q["Instructor Has Questions"]
    Q -.->|Comms/Admin responds & resends| S

    classDef comms fill:#fef9c3,stroke:#ca8a04,color:#713f12;
    classDef instr fill:#ffedd5,stroke:#ea580c,color:#7c2d12;
    class SEND comms;
    class Q instr;`,
  },
  {
    title: "Instructor Journey",
    description: "How the course owner reviews their migrated course.",
    chart: `flowchart TD
    IN(["Sent to Instructor"]) --> LOOK{"Instructor reviews<br/>their migrated course"}
    LOOK -->|Has a question| Q["Raise a Question<br/>(creates a tracked issue)"]
    LOOK -->|All good| APP["Approve"]
    Q --> WAIT["Waits for Admin/Comms reply,<br/>then it's resent"]
    WAIT -.-> LOOK
    APP --> FINAL(["Admin gives final sign-off"])

    classDef instr fill:#ffedd5,stroke:#ea580c,color:#7c2d12;
    classDef done fill:#e9d5ff,stroke:#9333ea,color:#581c87;
    class LOOK,Q,APP instr;
    class FINAL done;`,
  },
  {
    title: "Escalations",
    description: "A side conversation for flagged problems.",
    chart: `flowchart LR
    C["Someone raises an escalation<br/>(Critical / Major / Minor)"] --> O(("Open"))
    O --> T["People reply in the thread"]
    T --> O
    O -->|Admin resolves with a note| R(("Resolved"))

    note["An escalation is a SIDE conversation.<br/>Resolving it does NOT move the course by itself —<br/>a person still drives the course through the steps."]

    classDef n fill:#fee2e2,stroke:#dc2626,color:#7f1d1d;
    class note n;`,
  },
]

export default function GuidePage() {
  return (
    <>
      <Topbar title="Workflow Guide" subtitle="Understanding CourseBridge statuses and roles" />
      <TweakableContent className="flex-1 overflow-y-auto p-6 bg-background space-y-8">
        <section className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Introduction</h2>
            <p className="text-muted-foreground">
              CourseBridge manages the migration review workflow from Moodle to Brightspace. 
              This guide explains how courses move through the system and what each status represents.
            </p>
          </div>

          <Tabs defaultValue="workflow" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="workflow">Workflow Lifecycle</TabsTrigger>
              <TabsTrigger value="diagrams">Diagrams</TabsTrigger>
              <TabsTrigger value="statuses">Status Meanings</TabsTrigger>
              <TabsTrigger value="roles">Roles & Tabs</TabsTrigger>
            </TabsList>

            <TabsContent value="workflow" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="size-5 text-primary" />
                    The End-to-End Journey
                  </CardTitle>
                  <CardDescription>How a course moves from creation to final approval.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                    {/* Phase 1 */}
                    <div className="relative flex items-start gap-6">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-background">
                        <UserCheck className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-foreground">Phase 1: Assignment</h4>
                        <p className="text-sm text-muted-foreground">
                          New courses start as <Badge variant="secondary">Course Created</Badge>. 
                          An Admin assigns the course to a TA.
                        </p>
                      </div>
                    </div>

                    {/* Phase 2 */}
                    <div className="relative flex items-start gap-6">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-background">
                        <ClipboardCheck className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-foreground">Phase 2: TA Review</h4>
                        <p className="text-sm text-muted-foreground">
                          The TA completes a 5-step review (Metadata, Review Matrix, Syllabus/Gradebook, Issue Log, and Submission).
                          Status: <Badge variant="outline">TA Review In Progress</Badge>.
                        </p>
                      </div>
                    </div>

                    {/* Phase 3 */}
                    <div className="relative flex items-start gap-6">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-background">
                        <ShieldCheck className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-foreground">Phase 3: Quality Control</h4>
                        <p className="text-sm text-muted-foreground">
                          TA submits the review. An Admin performs a quality check.
                          They can either request changes, or approve it to move into staging.
                        </p>
                      </div>
                    </div>

                    {/* Phase 4: Staging Setup (NEW) */}
                    <div className="relative flex items-start gap-6">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 ring-8 ring-background">
                        <Server className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-foreground">Phase 4: Staging Setup</h4>
                        <p className="text-sm text-muted-foreground">
                          On approval the course enters <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Waiting on Admin</Badge>
                          while an Admin builds the staging shell, then pushes it back to the TA.
                        </p>
                      </div>
                    </div>

                    {/* Phase 5: Staging in Process (NEW) */}
                    <div className="relative flex items-start gap-6">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 ring-8 ring-background">
                        <Layers className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-foreground">Phase 5: Staging in Process</h4>
                        <p className="text-sm text-muted-foreground">
                          Status <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Staging in Process</Badge>.
                          The TA finalizes the course in staging and writes the <strong>Issues Summary</strong> (editable by TA and Admin),
                          then marks <strong>Course Complete</strong> to send it on to the instructor.
                        </p>
                      </div>
                    </div>

                    {/* Phase 6 */}
                    <div className="relative flex items-start gap-6">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-background">
                        <GraduationCap className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-foreground">Phase 6: Instructor Sign-off</h4>
                        <p className="text-sm text-muted-foreground">
                          The course is sent to the Instructor. They review the TA's findings and provide final SME approval.
                        </p>
                      </div>
                    </div>

                    {/* Phase 5 */}
                    <div className="relative flex items-start gap-6">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600 ring-8 ring-background">
                        <CheckCircle2 className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-foreground">Phase 7: Finalization</h4>
                        <p className="text-sm text-muted-foreground">
                          Admin performs a final review and marks the course as <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Final Approved</Badge>.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="diagrams" className="mt-6 space-y-6">
              {WORKFLOW_DIAGRAMS.map((d) => (
                <Card key={d.title}>
                  <CardHeader>
                    <CardTitle>{d.title}</CardTitle>
                    <CardDescription>{d.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MermaidDiagram chart={d.chart} />
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="statuses" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Status Definitions</CardTitle>
                  <CardDescription>What every status label means in the workflow.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Internal Pipeline</h4>
                      <div className="space-y-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Course Created</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Initial state. Course imported but not yet assigned.</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Assigned to TA</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">TA has been assigned but work hasn't started.</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">TA Review In Progress</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Active work phase for the TA team.</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Submitted to Admin</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Quality Check queue. Awaiting Admin review.</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/5">Admin Changes Requested</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">QA failed. TA needs to review and fix issues.</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Waiting on Admin</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Approved. Admin is building the staging shell before handing back to the TA.</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Staging in Process</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">TA is finalizing the course in staging and writing the Issues Summary.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Review & Approval</h4>
                      <div className="space-y-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Ready for Instructor</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Internal QA passed. Ready to be sent to SME.</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">Sent to Instructor</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">External review phase. Instructor is reviewing.</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Instructor Questions</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">SME has questions or requires clarification.</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Instructor Approved</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">SME has signed off on the review.</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-600 text-white hover:bg-green-700">Final Approved</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">The migration is complete and verified.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roles" className="mt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <ShieldCheck className="size-5" />
                      Admin Role
                    </CardTitle>
                    <CardDescription>Manages the team and quality standards.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <h5 className="text-sm font-semibold">Dashboard Tabs:</h5>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <ArrowRight className="size-4 mt-0.5 shrink-0 text-primary" />
                        <span><strong>All Courses:</strong> Real-time view of all active course reviews and their current status.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="size-4 mt-0.5 shrink-0 text-primary" />
                        <span><strong>Assign TA:</strong> Batch assignment tool for new courses waiting for a TA.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="size-4 mt-0.5 shrink-0 text-primary" />
                        <span><strong>Escalations:</strong> High-priority view for courses with active blockers or technical issues.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="size-4 mt-0.5 shrink-0 text-primary" />
                        <span><strong>Provision:</strong> Archive of all courses that have reached final approval.</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <BookOpen className="size-5" />
                      TA Role
                    </CardTitle>
                    <CardDescription>Executes the core migration review.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <h5 className="text-sm font-semibold">Dashboard View:</h5>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <ArrowRight className="size-4 mt-0.5 shrink-0 text-primary" />
                        <span><strong>Assigned:</strong> Total volume of courses currently in your queue.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Clock className="size-4 mt-0.5 shrink-0 text-primary" />
                        <span><strong>In Progress:</strong> Courses you are currently reviewing.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Send className="size-4 mt-0.5 shrink-0 text-primary" />
                        <span><strong>Submitted:</strong> Courses you've finished, awaiting Admin QA.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="size-4 mt-0.5 shrink-0 text-primary" />
                        <span><strong>Changes Requested:</strong> Revision needed based on Admin feedback.</span>
                      </li>
                    </ul>
                    <div className="p-3 rounded-lg bg-muted text-xs italic">
                      Note: TAs only see courses specifically assigned to them.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </TweakableContent>
    </>
  )
}

function ClipboardCheck({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  )
}
