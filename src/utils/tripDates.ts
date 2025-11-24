import { TripState } from "@/types";
import { parseISO, min, max, format } from "date-fns";

export function getTripDateRange(tripState: TripState): { startDate: string | null; endDate: string | null } {
    const dates: Date[] = [];

    tripState.dailySharedExpenses.forEach((e) => {
        if (e.startDate) dates.push(parseISO(e.startDate));
        if (e.endDate) dates.push(parseISO(e.endDate));
    });

    tripState.dailyPersonalExpenses.forEach((e) => {
        if (e.startDate) dates.push(parseISO(e.startDate));
        if (e.endDate) dates.push(parseISO(e.endDate));
    });

    if (dates.length === 0) {
        return { startDate: null, endDate: null };
    }

    const startDate = min(dates);
    const endDate = max(dates);

    return {
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
    };
}
