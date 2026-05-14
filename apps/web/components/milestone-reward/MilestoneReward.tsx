"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Meteors } from "@/components/ui/meteors"

const FORM_KEYS = ["course_metadata", "review_matrix", "syllabus_review"] as const
const THIRTY_MIN_MS = 30 * 60 * 1000

const EMOJIS = ["🧠", "☁️", "🌊", "🎯", "✨", "🍃", "🌿", "🕊️", "🌤️", "🌱"]
const MESSAGES = [
  "Somewhere, someone just smiled because they remembered a tiny kindness from years ago. Maybe the person who gave it forgot, but the feeling stayed. Small good things travel farther than we think.",
  "A cup of tea does not fix life, but for a few minutes, it makes the world softer. Some moments are not meant to solve anything. They are only meant to help you breathe.",
  "A dog does not care how productive your day was. It only cares that you came back. That kind of love is simple, honest, and sometimes exactly what the heart needs.",
  "Someone once planted a tree knowing they may never sit under its shade. That is hope: doing something good today for a future you may not fully see yet.",
  "The moon does not rush to become full. It changes slowly, quietly, and still lights up the sky in every phase. You are allowed to grow like that too.",
  "There is a person somewhere who still remembers a compliment they received on a hard day. A few kind words can become shelter inside someone's memory.",
  "A flower does not compete with the flower beside it. It simply opens when its time comes. Your pace can be different and still be beautiful.",
  "Some days feel heavy, but even on those days, the world keeps offering small gifts: warm sunlight, clean water, a song, a message, a quiet breath. Notice one. Let it count.",
  "A child laughs without checking if the moment is important enough. Joy does not always need a reason. Sometimes it only needs permission.",
  "There are mornings when the sky looks ordinary, and then suddenly it turns gold. Life can change its color quietly too. Stay open to the small golden parts.",
  "A friend may not always know what to say, but sitting beside you can still mean, \"You do not have to carry this alone.\" Presence is also love.",
  "Think of all the tiny things that had to go right for this moment to exist: your breath, your heartbeat, your courage, your effort. You are already holding many miracles.",
  "Someone, somewhere, is making food for a person they love. Someone is saving a seat. Someone is waiting to hear good news. The world is still full of care.",
  "Rain does not ask permission before it refreshes the earth. Sometimes a pause, a cry, or a quiet reset is not weakness. It is renewal.",
  "A small candle cannot remove the whole darkness, but it changes the room it is in. You do not have to fix everything to make something better.",
  "There is beauty in returning: returning to your breath, returning to your work, returning to yourself after a stressful moment. You can always begin again gently.",
  "Some people become safe places for others just by being kind in ordinary moments. A soft voice, a patient reply, a small check-in — these things matter more than they look.",
  "The ocean is powerful, but it still moves one wave at a time. You do not need to face the whole day at once. Just meet the next wave.",
  "A little bird sings before knowing what the day will bring. Maybe joy is not proof that everything is perfect. Maybe joy is courage with music in it.",
  "Your work matters, but so does the person doing the work. Take one soft breath. Come back not as a machine, but as a human being who deserves kindness too.",
]

type Props = { userEmail: string; courseId: string }

export function MilestoneReward({ userEmail: _userEmail, courseId }: Props) {
  const [open, setOpen] = useState(false)
  const [emoji] = useState(() => EMOJIS[Math.floor(Math.random() * EMOJIS.length)])
  const [message] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)])
  const firedRef = useRef(false)
  const shownKey = `coursebridge:${courseId}:milestone-shown`

  const fire = useCallback(() => {
    if (firedRef.current) return
    if (localStorage.getItem(shownKey)) return
    firedRef.current = true
    localStorage.setItem(shownKey, "1")
    setOpen(true)
  }, [shownKey])

  const allFormsDone = useCallback(() => {
    return FORM_KEYS.every(
      (key) => localStorage.getItem(`coursebridge:${courseId}:form-done:${key}`) === "1"
    )
  }, [courseId])

  // 1-hour timer — fires for all users
  useEffect(() => {
    const t = setTimeout(() => fire(), THIRTY_MIN_MS)
    return () => clearTimeout(t)
  }, [fire])

  // Poll for all 3 forms done (every 4s)
  useEffect(() => {
    if (allFormsDone()) { fire(); return }
    const iv = setInterval(() => {
      if (allFormsDone()) {
        fire()
        clearInterval(iv)
      }
    }, 4000)
    return () => clearInterval(iv)
  }, [allFormsDone, fire])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <Meteors number={10} className="bg-blue-400" />
            <Meteors number={8} className="bg-violet-400" />
            <Meteors number={6} className="bg-emerald-300" />
          </div>
          <motion.div
            className="relative mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-2xl text-center"
            initial={{ scale: 0.88, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: "spring", damping: 18, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl mb-4">{emoji}</div>
            <h2 className="text-lg font-bold mb-3 text-foreground">Take 15 seconds.</h2>
            <p className="text-sm text-muted-foreground leading-relaxed min-h-[40px] mb-6">
              {message}
            </p>
            <Button
              className="w-full bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white border-0"
              onClick={() => setOpen(false)}
            >
              Back to it
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
