import { zhCN } from "date-fns/locale"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import * as React from "react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"

import { Button, buttonVariants } from "@/lib/components/ui/button"
import { cn } from "@/lib/utils/cn"

const CHEVRON_DOWN_SVG = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpath d='m6 9 6 6 6-6'/%3e%3c/svg%3e")`

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      locale={zhCN}
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-3 [--cell-size:2rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) => `${date.getMonth() + 1}月`,
        formatYearDropdown: (date) => `${date.getFullYear()}`,
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between px-1 pointer-events-none",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-7 w-7 pointer-events-auto z-20 hover:opacity-100 text-muted-foreground hover:text-foreground cursor-pointer",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-7 w-7 pointer-events-auto z-20 hover:opacity-100 text-muted-foreground hover:text-foreground cursor-pointer",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-[--cell-size] w-full items-center justify-center px-[--cell-size]",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex items-center justify-center gap-2 w-full px-8 relative z-10",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative [&>span]:hidden",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "appearance-none outline-none border-none bg-transparent m-0 p-0",
          buttonVariants({ variant: "outline" }),
          "h-8 w-auto px-3 pr-8 font-normal cursor-pointer text-sm shadow-sm",
          "bg-no-repeat bg-[right_0.5rem_center] bg-[length:1rem_1rem]",
          "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-black focus-visible:border-[1px]",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "hidden",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground flex-1 select-none rounded-md text-[0.8rem] font-normal",
          defaultClassNames.weekday
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-[--cell-size] select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-muted-foreground select-none text-[0.8rem]",
          defaultClassNames.week_number
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
          // 强制选中状态高亮 (使用 aria-selected 选择器，优先级更高)
          "aria-selected:bg-primary aria-selected:text-primary-foreground hover:aria-selected:bg-primary hover:aria-selected:text-primary-foreground focus:aria-selected:bg-primary focus:aria-selected:text-primary-foreground",
          // 确保可点击时显示手型
          "!cursor-pointer"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: cn(
          "font-bold relative",
          // 今天的日期：始终显示边框
          "!border-2 !border-primary",
          // 今天的日期：未选中时显示背景
          "bg-accent/80 text-accent-foreground",
          // 今天的日期被选中时：保留边框，但使用选中背景色
          "aria-selected:!border-primary aria-selected:!border-2",
          // 确保可点击时显示手型
          "!cursor-pointer"
        ),
        day_outside: cn(
          "day-outside",
          "!text-muted-foreground !opacity-50",
          "aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          "!cursor-pointer"
        ),
        day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        range_start: cn(
          "bg-accent rounded-l-md",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("bg-accent rounded-r-md", defaultClassNames.range_end),
        // today: cn(
        //   "bg-accent/80 text-accent-foreground font-bold rounded-md data-[selected=true]:rounded-none",
        //   defaultClassNames.today
        // ),
        outside: cn(
          "!text-muted-foreground !opacity-50 aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      style={{
        ...props.style,
        "--rdp-dropdown-icon": CHEVRON_DOWN_SVG
      } as React.CSSProperties}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <>
              <style>{`
                .rdp-day_button {
                  cursor: pointer !important;
                }
                .rdp-day_outside,
                .rdp-day_outside.rdp-day_button,
                button.rdp-day_outside,
                .rdp-day.rdp-day_outside,
                .rdp-day_button.rdp-day_outside {
                  color: hsl(var(--muted-foreground)) !important;
                  opacity: 0.5 !important;
                }
                .rdp-day_outside *,
                .rdp-day_outside.rdp-day_button * {
                  color: hsl(var(--muted-foreground)) !important;
                  opacity: 0.5 !important;
                }
                .rdp-day_today,
                button[data-today="true"],
                [data-today="true"] {
                  border: 2px solid hsl(var(--primary)) !important;
                  font-weight: bold !important;
                }
                .rdp-day_today:not(.rdp-day_selected),
                button[data-today="true"]:not(.rdp-day_selected),
                [data-today="true"]:not(.rdp-day_selected) {
                  background-color: hsl(var(--accent) / 0.8) !important;
                  color: hsl(var(--accent-foreground)) !important;
                }
                .rdp-day_today.rdp-day_selected,
                button[data-today="true"].rdp-day_selected,
                [data-today="true"].rdp-day_selected {
                  border: 2px solid hsl(var(--primary)) !important;
                }
              `}</style>
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
            </>
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          )
        },
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

export { Calendar }
