"use client"

import { useCallback, useEffect, useRef } from "react"

const FORM_KEYS = ["course_metadata", "review_matrix", "syllabus_review"] as const
const THIRTY_MIN_MS = 30 * 60 * 1000

type Props = { userEmail: string; courseId: string }

export function MilestoneReward({ userEmail: _userEmail, courseId }: Props) {
  const firedRef = useRef(false)
  const shownKey = `coursebridge:${courseId}:milestone-shown`

  const fire = useCallback(() => {
    if (firedRef.current) return
    if (localStorage.getItem(shownKey)) return
    firedRef.current = true
    localStorage.setItem(shownKey, "1")
    window.dispatchEvent(new Event("coursebridge:open-meme-modal"))
  }, [shownKey])

  const allFormsDone = useCallback(() => {
    return FORM_KEYS.every(
      (key) => localStorage.getItem(`coursebridge:${courseId}:form-done:${key}`) === "1"
    )
  }, [courseId])

  useEffect(() => {
    const t = setTimeout(() => fire(), THIRTY_MIN_MS)
    return () => clearTimeout(t)
  }, [fire])

  useEffect(() => {
    if (allFormsDone()) {
      fire()
      return
    }
    const iv = setInterval(() => {
      if (allFormsDone()) {
        fire()
        clearInterval(iv)
      }
    }, 4000)
    return () => clearInterval(iv)
  }, [allFormsDone, fire])

  return null
}
