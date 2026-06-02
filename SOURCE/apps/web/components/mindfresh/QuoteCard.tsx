import { motion } from "framer-motion"
import { Textarea } from "@/components/ui/textarea"
import type { MindFreshItem } from "@/components/mindfresh/types"

const TYPE_META: Record<
  MindFreshItem["type"],
  { label: string; bg: string; border: string; labelColor: string }
> = {
  quote: {
    label: "Reset",
    bg: "bg-gradient-to-br from-cyan-100 to-teal-100 dark:from-cyan-900/60 dark:to-teal-900/50",
    border: "border border-teal-300/70 dark:border-teal-700/60",
    labelColor: "text-teal-700 dark:text-teal-300",
  },
  funny: {
    label: "Laugh it off",
    bg: "bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/50",
    border: "border border-amber-300/70 dark:border-amber-700/60",
    labelColor: "text-amber-700 dark:text-amber-300",
  },
  prompt: {
    label: "Reflect",
    bg: "bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/60 dark:to-purple-900/50",
    border: "border border-violet-300/70 dark:border-violet-700/60",
    labelColor: "text-violet-700 dark:text-violet-300",
  },
  breathing: {
    label: "Breathe",
    bg: "bg-gradient-to-br from-cyan-100 to-emerald-100 dark:from-cyan-900/60 dark:to-emerald-900/50",
    border: "border border-teal-300/70 dark:border-teal-700/60",
    labelColor: "text-teal-700 dark:text-teal-300",
  },
  game: {
    label: "Play",
    bg: "bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/60 dark:to-rose-900/50",
    border: "border border-pink-300/70 dark:border-pink-700/60",
    labelColor: "text-pink-700 dark:text-pink-300",
  },
}

export function QuoteCard({
  item,
  showInput = false,
}: {
  item: MindFreshItem
  showInput?: boolean
}) {
  const meta = TYPE_META[item.type] ?? TYPE_META.quote

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-2"
    >
      <div className={`rounded-lg p-4 shadow-sm ${meta.bg} ${meta.border}`}>
        <p className={`text-[10px] uppercase tracking-widest font-semibold mb-2 ${meta.labelColor}`}>
          {meta.label}
        </p>
        <p className="text-base font-medium leading-relaxed text-gray-900 dark:text-gray-100">
          {item.text}
        </p>
      </div>

      {showInput && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <Textarea
            placeholder="Type your answer here…"
            className="resize-none text-sm min-h-[72px] bg-background border-border/60 focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 transition-colors placeholder:text-muted-foreground/60"
          />
        </motion.div>
      )}
    </motion.div>
  )
}
