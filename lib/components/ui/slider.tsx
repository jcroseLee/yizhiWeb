import * as React from "react"

import { cn } from "@/lib/utils/cn"

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "defaultValue"> {
  value?: number[]
  defaultValue?: number[]
  onValueChange?: (value: number[]) => void
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, defaultValue, onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
    const internalValue = value?.[0] ?? defaultValue?.[0]

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(event.target.value)
      onValueChange?.([next])
    }

    return (
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={internalValue}
        onChange={handleChange}
        className={cn(
          "w-full cursor-pointer appearance-none rounded-full bg-stone-200 h-1",
          "outline-none",
          "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#C82E31] [&::-webkit-slider-thumb]:shadow",
          "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#C82E31] [&::-moz-range-thumb]:border-0",
          className
        )}
        {...props}
      />
    )
  }
)
Slider.displayName = "Slider"


