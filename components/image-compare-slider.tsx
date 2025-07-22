"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface ImageCompareSliderProps {
  beforeImageSrc: string
  afterImageSrc: string
  width?: number
  height?: number
}

export default function ImageCompareSlider({
  beforeImageSrc,
  afterImageSrc,
  width = 500, // Default width
  height = 300, // Default height
}: ImageCompareSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [sliderPosition, setSliderPosition] = useState(50) // Percentage from left
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      let newX = e.clientX - containerRect.left
      newX = Math.max(0, Math.min(newX, containerRect.width)) // Clamp between 0 and container width
      setSliderPosition((newX / containerRect.width) * 100)
    },
    [isDragging],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    } else {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg shadow-lg border border-gray-600"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* Before Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={beforeImageSrc || "/placeholder.svg"}
        alt="Before"
        className="absolute top-0 left-0 w-full h-full object-cover"
        draggable="false"
      />

      {/* After Image (clipped) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={afterImageSrc || "/placeholder.svg"}
        alt="After"
        className="absolute top-0 left-0 w-full h-full object-cover"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        draggable="false"
      />

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10 flex items-center justify-center"
        style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute w-10 h-10 rounded-full bg-white border-2 border-gray-400 flex items-center justify-center -ml-4" style={{ marginLeft: 'auto' }} >
          <ChevronLeft className="h-5 w-5 text-gray-700" />
          <ChevronRight className="h-5 w-5 text-gray-700 -ml-2" />
        </div>
      </div>
    </div>
  )
}
