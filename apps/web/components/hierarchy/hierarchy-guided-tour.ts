"use client"

import { useCallback } from "react"
import { driver, type DriveStep } from "driver.js"
import "driver.js/dist/driver.css"
import "./hierarchy-tour.css"

/**
 * Friendly walkthrough of the org explorer, built on driver.js (same library as
 * the instructor tour). Steps are filtered to whatever is actually on screen, so
 * the tour adapts to the institution (top) level — which has no leadership or
 * course table yet — versus a drilled-in unit.
 */
const ALL_STEPS: DriveStep[] = [
  {
    popover: {
      title: "Welcome 👋",
      description:
        "This is your institution explorer. Here's a 30-second tour so you know how to get around. You can stop anytime.",
    },
  },
  {
    element: '[data-tour="breadcrumb"]',
    popover: {
      title: "You are here",
      description:
        "This trail shows where you are. Click any level — like <b>Institution</b> — to jump back up.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="subunits"]',
    popover: {
      title: "Click to drill in",
      description:
        "Each card is a college, school, or department. <b>Click one</b> to open it and see its courses, leaders, and progress.",
      side: "top",
      align: "start",
    },
  },
  {
    element: '[data-tour="kpis"]',
    popover: {
      title: "A quick health check",
      description:
        "How many courses there are, and how many are <b>done</b>, <b>in progress</b>, or <b>need attention</b> — for whatever you're viewing.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="leadership"]',
    popover: {
      title: "Who's in charge",
      description: "The deans, department heads, and other leaders for this unit.",
      side: "top",
      align: "start",
    },
  },
  {
    element: '[data-tour="courses"]',
    popover: {
      title: "Every course, in detail",
      description:
        "All the courses in this unit. <b>Search</b>, or filter by <b>status</b> or <b>term</b>, and page through them.",
      side: "top",
      align: "start",
    },
  },
  {
    popover: {
      title: "That's it!",
      description:
        "You're all set. Tap <b>Show me around</b> at the top anytime to see this tour again.",
    },
  },
]

export function useHierarchyTour() {
  const startTour = useCallback(() => {
    // Keep only the welcome/end cards and any step whose target is on screen.
    const steps = ALL_STEPS.filter(
      (s) => !s.element || document.querySelector(s.element as string),
    )

    const d = driver({
      showProgress: true,
      allowClose: true,
      animate: true,
      smoothScroll: true,
      overlayColor: "#0b0b12",
      overlayOpacity: 0.72,
      stagePadding: 8,
      stageRadius: 14,
      popoverClass: "cb-hierarchy-tour",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Got it 🎉",
      steps,
    })

    d.drive()
  }, [])

  return { startTour }
}
