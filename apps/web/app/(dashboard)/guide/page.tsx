import { Topbar } from "@/components/layout/topbar"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { BookOpen, UserCheck, ShieldCheck, GraduationCap, ArrowRight, CheckCircle2, Clock, AlertTriangle, Send } from "lucide-react"

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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="workflow">Workflow Lifecycle</TabsTrigger>
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
                          They can either request changes or approve it for the instructor.
                        </p>
                      </div>
                    </div>

                    {/* Phase 4 */}
                    <div className="relative flex items-start gap-6">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-background">
                        <GraduationCap className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-foreground">Phase 4: Instructor Sign-off</h4>
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
                        <h4 className="font-semibold text-foreground">Phase 5: Finalization</h4>
                        <p className="text-sm text-muted-foreground">
                          Admin performs a final review and marks the course as <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Final Approved</Badge>.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
