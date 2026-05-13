import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MindFreshItem } from "@/components/mindfresh/types"

export function QuoteCard({ item }: { item: MindFreshItem }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Card className="bg-gradient-to-br from-teal-50 to-cyan-100/70 ring-teal-200 dark:from-teal-950/40 dark:to-cyan-900/30 dark:ring-teal-800/60">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-teal-700 dark:text-teal-300">15-sec reset</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium leading-relaxed text-foreground">{item.text}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
