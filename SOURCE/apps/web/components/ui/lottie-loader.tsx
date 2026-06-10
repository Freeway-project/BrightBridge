"use client"

import Lottie from "lottie-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

import anim1 from "@/assets/adrock.json"
import anim2 from "@/assets/bacon.json"
import anim3 from "@/assets/dalek.json"
import anim4 from "@/assets/favorite-pop.json"
import anim5 from "@/assets/gatin.json"
import anim6 from "@/assets/happy-2016.json"
import anim7 from "@/assets/lights.json"
import anim8 from "@/assets/pagination-bounce.json"
import anim9 from "@/assets/ripple.json"
import anim10 from "@/assets/starfish.json"
import anim11 from "@/assets/acrobatics.json"
import anim12 from "@/assets/bouncing-ball.json"
import anim13 from "@/assets/browser-window.json"
import anim14 from "@/assets/coffee-cup.json"
import anim15 from "@/assets/confetti-burst.json"
import anim16 from "@/assets/cooking.json"
import anim17 from "@/assets/done-check.json"
import anim18 from "@/assets/emoji-shock.json"
import anim19 from "@/assets/emoji-wink.json"
import anim20 from "@/assets/exploding-star.json"
import anim21 from "@/assets/fireworks-spark.json"
import anim22 from "@/assets/funky-chicken.json"
import anim23 from "@/assets/happy.json"
import anim24 from "@/assets/heart-pop.json"
import anim25 from "@/assets/jolly-walker.json"
import anim26 from "@/assets/leap-loader.json"
import anim27 from "@/assets/like-pop.json"
import anim28 from "@/assets/lunch-time.json"
import anim29 from "@/assets/party-penguin.json"
import anim30 from "@/assets/square-wheel.json"

const ALL_ANIMATIONS = [
  anim1, anim2, anim3, anim4, anim5, anim6, anim7, anim8, anim9, anim10,
  anim11, anim12, anim13, anim14, anim15, anim16, anim17, anim18, anim19, anim20,
  anim21, anim22, anim23, anim24, anim25, anim26, anim27, anim28, anim29, anim30
]

interface LottieLoaderProps {
  className?: string
}

export function LottieLoader({ className }: LottieLoaderProps) {
  const [animationData, setAnimationData] = useState<any>(null)

  useEffect(() => {
    const randomAnim = ALL_ANIMATIONS[Math.floor(Math.random() * ALL_ANIMATIONS.length)]
    setAnimationData(randomAnim)
  }, [])

  if (!animationData) {
    return <div className={cn("w-full h-full", className)} />
  }

  return (
    <div className={cn("flex items-center justify-center w-full h-full", className)}>
      <Lottie 
        animationData={animationData} 
        loop={true} 
        style={{ width: "100%", height: "100%", maxHeight: "100%", maxWidth: "100%" }} 
      />
    </div>
  )
}
