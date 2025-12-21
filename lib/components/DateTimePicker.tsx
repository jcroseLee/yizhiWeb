"use client"

import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import * as React from "react"

import { Button } from "@/lib/components/ui/button"
import { Calendar } from "@/lib/components/ui/calendar"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/lib/components/ui/popover"
import { cn } from "@/lib/utils/cn"

interface DateTimePickerProps {
  date?: Date
  setDate: (date: Date) => void
  className?: string
  buttonClassName?: string
  showLabel?: boolean
}

export function DateTimePicker({ date, setDate, className, buttonClassName, showLabel = true }: DateTimePickerProps) {
  // 选中的日期，默认为传入的 date
  const [selectedDateTime, setSelectedDateTime] = React.useState<Date | undefined>(
    date
  )

  // 当外部 date 更新时，同步内部状态
  React.useEffect(() => {
    if (date) {
      setSelectedDateTime(date)
    }
  }, [date])

  // 处理日历选择（只更新年月日，保留时间）
  const handleSelectDate = (day: Date | undefined) => {
    if (!day) return

    const newDateTime = new Date(day)

    // 如果之前已经有选中时间，则保留那个时间
    if (selectedDateTime) {
      newDateTime.setHours(selectedDateTime.getHours())
      newDateTime.setMinutes(selectedDateTime.getMinutes())
    } else {
      // 否则默认设为当前时间或 00:00，视需求而定
      const now = new Date()
      newDateTime.setHours(now.getHours())
      newDateTime.setMinutes(now.getMinutes())
    }

    setSelectedDateTime(newDateTime)
    setDate(newDateTime)
  }

  // 处理时间选择（只更新时分，保留年月日）
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeStr = e.target.value
    if (!timeStr) return

    const [hours, minutes] = timeStr.split(":").map(Number)

    // 如果已有选中日期，则更新其时间；否则创建新日期（使用当前日期）
    const baseDate = selectedDateTime || new Date()
    const newDateTime = new Date(baseDate)
    newDateTime.setHours(hours)
    newDateTime.setMinutes(minutes)

    setSelectedDateTime(newDateTime)
    setDate(newDateTime)
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {showLabel && <Label className="text-sm font-medium">起卦时间</Label>}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[270px] h-10 justify-start text-left font-normal",
              !date && "text-muted-foreground",
              buttonClassName
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? (
              format(date, "yyyy/MM/dd HH:mm")
            ) : (
              <span>选择日期时间</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white" align="start">
          {/* 上半部分：日历 */}
          <Calendar
            mode="single"
            selected={selectedDateTime}
            onSelect={handleSelectDate}
            initialFocus
            captionLayout="dropdown"
            startMonth={new Date(2000, 0)}
            endMonth={new Date(2050, 11, 31)}
          />

          {/* 下半部分：时间选择 */}
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="time-input" className="text-sm font-medium">
                时间：
              </Label>
              <Input
                id="time-input"
                type="time"
                step="60" // 隐藏秒
                className="w-full"
                value={
                  selectedDateTime
                    ? format(selectedDateTime, "HH:mm")
                    : date
                      ? format(date, "HH:mm")
                      : format(new Date(), "HH:mm")
                }
                onChange={handleTimeChange}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

