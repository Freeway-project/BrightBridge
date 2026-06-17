"use client"

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react"
import { cn } from "@/lib/utils"

export interface ParticleConfig {
  x: number
  y: number
  vx: number
  vy: number
  scale: number
  rotation: number
  rotationDirection: string
  siner: number
  steps: number
  friction: number
  element: Element | null
}

export interface AnimatedBubbleParticlesProps {
  className?: string
  backgroundColor?: string
  particleColor?: string
  particleSize?: number
  spawnInterval?: number
  height?: string
  width?: string
  enableGooEffect?: boolean
  blurStrength?: number
  pauseOnBlur?: boolean
  zIndex?: number
  friction?: { min: number; max: number }
  scaleRange?: { min: number; max: number }
  children?: React.ReactNode
}

const AnimatedBubbleParticles: React.FC<AnimatedBubbleParticlesProps> = ({
  className,
  backgroundColor = "#0d0d0d",
  particleColor = "#818cf8",
  particleSize = 30,
  spawnInterval = 180,
  height = "100vh",
  width = "100vw",
  enableGooEffect = true,
  blurStrength = 12,
  pauseOnBlur = true,
  zIndex = 1,
  friction = { min: 1, max: 2 },
  scaleRange = { min: 0.4, max: 2.4 },
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const intervalRef = useRef<number | undefined>(undefined)
  const particlesArrayRef = useRef<ParticleConfig[]>([])
  const isPausedRef = useRef(false)
  const gooIdRef = useRef("goo-" + Math.random().toString(36).substring(2, 11))

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  // Keep the latest color in a ref so cycling it spawns new-colored bubbles
  // without tearing down the animation effect (which would wipe the field).
  const particleColorRef = useRef(particleColor)
  useEffect(() => {
    particleColorRef.current = particleColor
  }, [particleColor])

  // Stabilize object-literal props so the spawn callbacks don't change every render.
  const frictionRange = useMemo(
    () => ({ min: friction.min, max: friction.max }),
    [friction.min, friction.max]
  )
  const scaleRangeStable = useMemo(
    () => ({ min: scaleRange.min, max: scaleRange.max }),
    [scaleRange.min, scaleRange.max]
  )

  const createParticleElement = useCallback(() => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.style.cssText =
      "display:block;" +
      "width:" + particleSize + "px;" +
      "height:" + particleSize + "px;" +
      "position:absolute;" +
      "transform:translateZ(0px);"
    svg.setAttribute("viewBox", "0 0 67.4 67.4")

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle")
    circle.setAttribute("cx", "33.7")
    circle.setAttribute("cy", "33.7")
    circle.setAttribute("r", "33.7")
    circle.setAttribute("fill", particleColorRef.current)
    svg.appendChild(circle)
    return svg
  }, [particleSize])

  const createParticle = useCallback((): ParticleConfig => {
    const element = createParticleElement()
    if (particlesRef.current) {
      particlesRef.current.appendChild(element)
    }

    const x = Math.random() * dimensions.width
    const y = dimensions.height + 100
    const steps = dimensions.height / 2
    const frictionValue = frictionRange.min + Math.random() * (frictionRange.max - frictionRange.min)
    const scale = scaleRangeStable.min + Math.random() * (scaleRangeStable.max - scaleRangeStable.min)
    const siner = (dimensions.width / 2.5) * Math.random()
    const rotationDirection = Math.random() > 0.5 ? "+" : "-"

    element.style.transform = "translateX(" + x + "px) translateY(" + y + "px)"

    return { x, y, vx: 0, vy: 0, scale, rotation: 0, rotationDirection, siner, steps, friction: frictionValue, element }
  }, [createParticleElement, dimensions, frictionRange, scaleRangeStable])

  const updateParticle = (particle: ParticleConfig): boolean => {
    particle.y -= particle.friction

    const left = particle.x + Math.sin((particle.y * Math.PI) / particle.steps) * particle.siner
    const top = particle.y
    const rotation = particle.rotationDirection + (particle.y + particleSize)

    if (particle.element) {
      const el = particle.element as SVGElement
      el.style.transform =
        "translateX(" + left + "px) translateY(" + top + "px) scale(" + particle.scale + ") rotate(" + rotation + "deg)"
    }

    if (particle.y < -particleSize) {
      particle.element?.parentNode?.removeChild(particle.element)
      return false
    }
    return true
  }

  const animate = useCallback(() => {
    if (!isPausedRef.current) {
      particlesArrayRef.current = particlesArrayRef.current.filter(updateParticle)
    }
    animationRef.current = requestAnimationFrame(animate)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const spawnParticle = useCallback(() => {
    if (!isPausedRef.current && dimensions.width > 0 && dimensions.height > 0) {
      particlesArrayRef.current.push(createParticle())
    }
  }, [dimensions, createParticle])

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect()
        setDimensions({ width: r.width, height: r.height })
      }
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  useEffect(() => {
    if (!pauseOnBlur) return
    const onBlur = () => { isPausedRef.current = true }
    const onFocus = () => { isPausedRef.current = false }
    window.addEventListener("blur", onBlur)
    window.addEventListener("focus", onFocus)
    return () => {
      window.removeEventListener("blur", onBlur)
      window.removeEventListener("focus", onFocus)
    }
  }, [pauseOnBlur])

  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return

    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)

    animationRef.current = requestAnimationFrame(animate)
    intervalRef.current = window.setInterval(spawnParticle, spawnInterval)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
      particlesArrayRef.current.forEach((p) => p.element?.parentNode?.removeChild(p.element))
      particlesArrayRef.current = []
    }
  }, [dimensions, spawnInterval, animate, spawnParticle])

  const backgroundClass = (() => {
    if (typeof className === "string" && className.split(" ").some((c) => c.startsWith("bg-"))) return ""
    return `bg-[${backgroundColor}]`
  })()

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", backgroundClass, className)}
      style={{ zIndex, width, height }}
    >
      <div
        ref={particlesRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        style={{ filter: enableGooEffect ? `url(#${gooIdRef.current})` : undefined }}
      />

      <div className="absolute inset-0 flex items-center justify-center z-10 w-full h-full">
        {children}
      </div>

      {enableGooEffect && (
        <svg className="absolute w-0 h-0 z-0" aria-hidden="true">
          <defs>
            <filter id={gooIdRef.current}>
              <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation={blurStrength} />
              <feColorMatrix
                in="blur"
                result="colormatrix"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 21 -9"
              />
              <feBlend in="SourceGraphic" in2="colormatrix" />
            </filter>
          </defs>
        </svg>
      )}
    </div>
  )
}

export { AnimatedBubbleParticles }
export default AnimatedBubbleParticles
