"use client";

import { DateRangePicker as HeroDateRangePicker } from "@heroui/date-picker";
import { parseDate, getLocalTimeZone, CalendarDate } from "@internationalized/date";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

interface DatePickerWithRangeProps {
    className?: string;
    date?: DateRange;
    onDateChange?: (range: DateRange | undefined) => void;
    label?: string;
}

export function DatePickerWithRange({
    className,
    date,
    onDateChange,
    label = "Date Range",
}: DatePickerWithRangeProps) {
    // Convert JS Date to CalendarDate
    const toCalendarDate = (date: Date): CalendarDate => {
        return parseDate(format(date, "yyyy-MM-dd"));
    };

    // Convert CalendarDate to JS Date
    const toDate = (calendarDate: CalendarDate): Date => {
        return calendarDate.toDate(getLocalTimeZone());
    };

    const value = date?.from && date?.to ? {
        start: toCalendarDate(date.from),
        end: toCalendarDate(date.to),
    } : null;

    return (
        <HeroDateRangePicker
            label={label}
            className={className}
            value={value}
            onChange={(range) => {
                if (range) {
                    onDateChange?.({
                        from: toDate(range.start),
                        to: toDate(range.end),
                    });
                } else {
                    onDateChange?.(undefined);
                }
            }}
            visibleMonths={2}
            pageBehavior="single"
        />
    );
}
