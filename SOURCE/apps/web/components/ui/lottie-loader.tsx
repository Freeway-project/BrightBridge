"use client"

import Lottie from "lottie-react"
import animationData from "@/assets/a64137b0-1170-11ee-bde3-930da0387bd4.json"
import { cn } from "@/lib/utils"

interface LottieLoaderProps {
  className?: string
}

export function LottieLoader({ className }: LottieLoaderProps) {
  return (
    <div className={cn("inline-flex items-center justify-center shrink-0", className)}>
      <Lottie 
        animationData={animationData} 
        loop={true} 
        style={{ width: "100%", height: "100%" }} 
      />
    </div>
  )
}
