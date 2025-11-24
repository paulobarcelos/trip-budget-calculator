import { useMemo } from "react";
import { TripState } from "@/types";
import { getTripDateRange } from "@/utils/tripDates";
import { parseISO, isWithinInterval, format } from "date-fns";

export type DayStatus = "complete" | "partial" | "missing";

export function useDayUsageStatus(tripState: TripState) {
    const { startDate, endDate } = useMemo(
        () => getTripDateRange(tripState),
        [tripState]
    );

    const dayStatus = useMemo(() => {
        const status = new Map<string, DayStatus>();

        if (!startDate || !endDate) return status;

        const start = parseISO(startDate);
        const end = parseISO(endDate);
        const current = new Date(start);

        // Iterate until the day BEFORE the end date
        while (current < end) {
            const dateStr = format(current, "yyyy-MM-dd");

            // Find active expenses for this day
            // Expenses are inclusive of start date but exclusive of end date for logic
            const activeShared = tripState.dailySharedExpenses.filter(e => {
                const start = parseISO(e.startDate);
                const end = new Date(parseISO(e.endDate).getTime() - 1);
                if (end < start) return false;
                return isWithinInterval(current, { start, end });
            });
            const activePersonal = tripState.dailyPersonalExpenses.filter(e => {
                const start = parseISO(e.startDate);
                const end = new Date(parseISO(e.endDate).getTime() - 1);
                if (end < start) return false;
                return isWithinInterval(current, { start, end });
            });

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

    return { startDate, endDate, dayStatus };
}
