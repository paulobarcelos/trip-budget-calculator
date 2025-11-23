import { useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { TripState } from "@/types";
import { getTripDateRange } from "@/utils/tripDates";
import { isSameDay, parseISO, differenceInCalendarMonths, isWithinInterval, startOfMonth, endOfMonth, format } from "date-fns";

interface UsageCalendarProps {
    tripState: TripState;
    onDaySelect: (date: Date) => void;
}

export function UsageCalendar({ tripState, onDaySelect }: UsageCalendarProps) {
    const { startDate, endDate } = useMemo(
        () => getTripDateRange(tripState),
        [tripState]
    );

    const numMonths = useMemo(() => {
        if (!startDate || !endDate) return 1;
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        return differenceInCalendarMonths(end, start) + 1;
    }, [startDate, endDate]);

    // Calculate usage status for each day
    const dayStatus = useMemo(() => {
        const status = new Map<string, "complete" | "partial" | "missing">();

        if (!startDate || !endDate) return status;

        const start = parseISO(startDate);
        const end = parseISO(endDate);
        const current = new Date(start);

        // Iterate until the day BEFORE the end date
        while (current < end) {
            const dateStr = format(current, "yyyy-MM-dd");

            // Find active expenses for this day
            // Expenses are inclusive of start date but exclusive of end date for logic
            const activeShared = tripState.dailySharedExpenses.filter(e =>
                isWithinInterval(current, { start: parseISO(e.startDate), end: new Date(parseISO(e.endDate).getTime() - 1) })
            );
            const activePersonal = tripState.dailyPersonalExpenses.filter(e =>
                isWithinInterval(current, { start: parseISO(e.startDate), end: new Date(parseISO(e.endDate).getTime() - 1) })
            );

            if (activeShared.length === 0 && activePersonal.length === 0) {
                current.setDate(current.getDate() + 1);
                continue;
            }

            let assignedCount = 0;
            let totalActive = activeShared.length + activePersonal.length;

            const dayUsage = tripState.usageCosts.days[dateStr];

            activeShared.forEach(e => {
                const assigned = dayUsage?.dailyShared[e.id]?.length || 0;
                if (assigned > 0) assignedCount++;
            });

            activePersonal.forEach(e => {
                const assigned = dayUsage?.dailyPersonal[e.id]?.length || 0;
                if (assigned > 0) assignedCount++;
            });

            if (assignedCount === 0) {
                status.set(dateStr, "missing");
            } else if (assignedCount === totalActive) {
                status.set(dateStr, "complete");
            } else {
                status.set(dateStr, "partial");
            }

            current.setDate(current.getDate() + 1);
        }

        return status;
    }, [tripState, startDate, endDate]);

    const modifiersClassNames = {
        complete: "bg-green-100 text-green-900 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-100 dark:hover:bg-green-900/50 font-medium",
        partial: "bg-yellow-100 text-yellow-900 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-100 dark:hover:bg-yellow-900/50 font-medium",
        missing: "bg-red-100 text-red-900 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-100 dark:hover:bg-red-900/50 font-medium",
    };

    // If no dates are set, default to today
    const defaultMonth = startDate ? startOfMonth(parseISO(startDate)) : new Date();
    // Ensure we show the full start and end months
    const startMonth = startDate ? startOfMonth(parseISO(startDate)) : undefined;
    const endMonth = endDate ? endOfMonth(parseISO(endDate)) : undefined;

    const modifiers = {
        complete: (date: Date) => dayStatus.get(format(date, "yyyy-MM-dd")) === "complete",
        partial: (date: Date) => dayStatus.get(format(date, "yyyy-MM-dd")) === "partial",
        missing: (date: Date) => dayStatus.get(format(date, "yyyy-MM-dd")) === "missing",
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-100 border border-green-200 dark:bg-green-900/30 dark:border-green-800"></div>
                    <span className="text-muted-foreground">Fully Assigned</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800"></div>
                    <span className="text-muted-foreground">Partially Assigned</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-100 border border-red-200 dark:bg-red-900/30 dark:border-red-800"></div>
                    <span className="text-muted-foreground">Missing Assignment</span>
                </div>
            </div>
            <div className="flex justify-center border rounded-md p-4 w-full overflow-x-auto">
                <Calendar
                    key={startDate} // Force re-mount when start date changes to ensure defaultMonth is respected
                    mode="single"
                    selected={undefined}
                    onSelect={(date) => date && onDaySelect(date)}
                    defaultMonth={defaultMonth}
                    fromMonth={startMonth}
                    toMonth={endMonth}
                    disableNavigation
                    showOutsideDays={false}
                    modifiers={modifiers}
                    modifiersClassNames={modifiersClassNames}
                    disabled={(date) => {
                        if (!startDate || !endDate) return false;
                        // Disable dates before start date OR on/after end date
                        if (date < parseISO(startDate) || date >= parseISO(endDate)) return true;

                        // Disable days with no active expenses
                        return !dayStatus.has(format(date, "yyyy-MM-dd"));
                    }}
                    numberOfMonths={numMonths}
                    className="w-full max-w-full"
                    classNames={{
                        months: "flex flex-col md:flex-row gap-8 flex-wrap justify-center",
                        month: "space-y-4",
                        table: "w-full border-collapse space-y-1",
                        head_row: "flex",
                        row: "flex w-full mt-2",
                        cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                        day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors",
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                        day_today: "bg-accent text-accent-foreground",
                        day_outside: "text-muted-foreground opacity-50",
                        day_disabled: "text-muted-foreground opacity-30 bg-transparent hover:bg-transparent hover:text-muted-foreground cursor-not-allowed",
                        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                        day_hidden: "invisible",
                    }}
                />
            </div>
        </div>
    );
}
