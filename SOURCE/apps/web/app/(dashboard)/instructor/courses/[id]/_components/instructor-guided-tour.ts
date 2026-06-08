"use client"

import { useCallback, useRef } from "react"
import { driver, type Driver, type DriveStep } from "driver.js"
import "driver.js/dist/driver.css"

/**
 * Guided walkthrough for the Simple instructor view, built on driver.js.
 *
 * The wizard shows one screen at a time, so each tour step must put the wizard
 * on the right step BEFORE driver tries to spotlight that step's control. We
 * override onNextClick/onPrevClick to (1) change the wizard step, (2) wait two
 * animation frames for React to render, then (3) advance driver — guaranteeing
 * the target element exists when it's highlighted.
 */

// wizardStep for each tour index; undefined = no wizard change (centered cards).
const WIZARD_STEP_BY_INDEX: Array<number | undefined> = [
  undefined, // 0 welcome
  0, // 1 view toggle
  0, // 2 review summary
  1, // 3 ask a question
  2, // 4 approve
  undefined, // 5 end
]

const STEPS: DriveStep[] = [
  {
    popover: {
      title: "Welcome 👋",
      description:
        "This is your migrated course. Here's a quick 20-second tour so you know what everything does. You can stop anytime.",
    },
  },
  {
    element: '[data-tour="view-toggle"]',
    popover: {
      title: "Two ways to view",
      description:
        "<b>Simple</b> walks you through step by step. <b>Full details</b> shows everything at once. You can switch back and forth whenever you like.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="review-summary"]',
    popover: {
      title: "What was checked",
      description:
        "This is what our reviewer looked at. <b>Green</b> means it looks good. <b>Orange</b> means they flagged something to be aware of.",
      side: "top",
      align: "start",
    },
  },
  {
    element: '[data-tour="ask-question"]',
    popover: {
      title: "Not sure about something?",
      description:
        "Tap here to send a question straight to the reviewer. They'll get back to you, and the course waits for your reply.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="approve"]',
    popover: {
      title: "Happy with everything?",
      description:
        "Tick the box and tap <b>Approve</b>. That tells the team you're done — and that's all you need to do.",
      side: "top",
      align: "end",
    },
  },
  {
    popover: {
      title: "That's it!",
      description:
        "You're all set. Tap the <b>? Help</b> button at the top anytime to see this tour again.",
    },
  },
]

function nextFrame(fn: () => void) {
  requestAnimationFrame(() => requestAnimationFrame(fn))
}

export function useInstructorTour(setWizardStep: (step: number) => void) {
  const driverRef = useRef<Driver | null>(null)

  const startTour = useCallback(() => {
    // Always begin from the first wizard step for a predictable tour.
    setWizardStep(0)

    const d = driver({
      showProgress: true,
      allowClose: true,
      overlayColor: "#0f172a",
      overlayOpacity: 0.7,
      stagePadding: 6,
      stageRadius: 10,
      popoverClass: "cb-instructor-tour",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Done",
      steps: STEPS,
      onNextClick: () => {
        const current = d.getActiveIndex() ?? 0
        const ws = WIZARD_STEP_BY_INDEX[current + 1]
        if (ws !== undefined) setWizardStep(ws)
        nextFrame(() => d.moveNext())
      },
      onPrevClick: () => {
        const current = d.getActiveIndex() ?? 0
        const ws = WIZARD_STEP_BY_INDEX[current - 1]
        if (ws !== undefined) setWizardStep(ws)
        nextFrame(() => d.movePrevious())
      },
      onDestroyed: () => {
        setWizardStep(0)
        driverRef.current = null
      },
    })

    driverRef.current = d
    d.drive()
  }, [setWizardStep])

  return { startTour }
}
