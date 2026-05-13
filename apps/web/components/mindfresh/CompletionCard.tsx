import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CheckInMood } from "@/components/mindfresh/types"

const MESSAGES: Record<CheckInMood, { title: string; body: string }> = {
  overwhelmed: {
    title: "You stepped back. Good.",
    body: "That's not small. Take the next step slowly.",
  },
  neutral: {
    title: "A small reset counts.",
    body: "You showed up. Keep going.",
  },
  good: {
    title: "Already doing well.",
    body: "Now you're doing a little better.",
  },
  energized: {
    title: "Momentum maintained.",
    body: "Get back in there.",
  },
}

const FALLBACK = {
  title: "Back to work, gently.",
  body: "Nice reset. Keep your next step small and clear.",
}

export function CompletionCard({ mood }: { mood: CheckInMood | null }) {
  const { title, body } = mood ? MESSAGES[mood] : FALLBACK

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Card className="border-emerald-300/70 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/40">
        <CardHeader>
          <CardTitle className="text-emerald-700 dark:text-emerald-300">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{body}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
