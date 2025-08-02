import React, { useEffect, useState } from 'react'

interface AnimatedCounterProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
}

export function AnimatedCounter({ 
  value, 
  duration = 1000, 
  prefix = '', 
  suffix = '',
  className = ''
}: AnimatedCounterProps) {
  const [currentValue, setCurrentValue] = useState(0)

  useEffect(() => {
    let startTime: number
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      
      setCurrentValue(Math.floor(easeOutQuart * value))
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      } else {
        setCurrentValue(value)
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [value, duration])

  return (
    <span className={className}>
      {prefix}{currentValue}{suffix}
    </span>
  )
}