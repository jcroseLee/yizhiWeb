"use client"

import { ChevronDownIcon } from "lucide-react"
import * as React from "react"
import { useEffect } from "react"

import { Button } from "@/lib/components/ui/button"
import { Calendar } from "@/lib/components/ui/calendar"
import { Input } from "@/lib/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/lib/components/ui/popover"

// Helper function to format date consistently (avoiding hydration mismatch)
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}/${month}/${day}`
}

// Helper function to format time as HH:mm:ss
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  return `${hours}:${minutes}`
}

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date) => void
}

export function DatePicker({ date: controlledDate, onDateChange }: DatePickerProps = {}) {
  const [open, setOpen] = React.useState(false)
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(undefined)
  const [currentTime, setCurrentTime] = React.useState<string>("")
  
  // Set current time on mount (client-side only to avoid hydration mismatch)
  useEffect(() => { 
    const currentTime = formatTime(new Date())
    console.log("setCurren tTime", currentTime)
    setTimeout(() => {
      setCurrentTime(currentTime)
    }, 1000)
  }, [])
  
  // Use controlled date if provided, otherwise use internal state
  const date = controlledDate ?? internalDate
  
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      if (onDateChange) {
        onDateChange(selectedDate)
      } else {
        setInternalDate(selectedDate)
      }
      setOpen(false)
    }
  }

  return (
    <div className="flex gap-4">
      <div className="flex flex-col gap-3">
        {/* <Label htmlFor="date-picker" className="px-1">
          起卦时间
        </Label> */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date-picker"
              className="w-[188px] justify-between font-normal cursor-pointer"
            >
              {date ? formatDate(date) : "选择日期"}
              <ChevronDownIcon className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0 bg-white" align="start">
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              startMonth={new Date(1900, 0)}
              endMonth={new Date(2100, 11, 31)}
              onSelect={handleDateSelect}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-3">
        {/* <Label htmlFor="time-picker" className="px-1">
          时间
        </Label> */}
        <Input
          type="time"
          id="time-picker"
          step="60"
          defaultValue={currentTime || "00:00"}
          className="bg-background h-9 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    </div>
  )
}
