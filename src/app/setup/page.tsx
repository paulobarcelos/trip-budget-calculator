"use client";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { TripState } from "@/types";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { initialTripState } from "@/constants/initialState";
import { updateTripDates } from "@/utils/tripStateUpdates";
import { Instructions } from "@/components/Instructions";
import { instructions } from "./instructions";
import { migrateState } from "@/utils/stateMigrations";
import { decodeState } from "@/utils/stateEncoding";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { addDays, format, parseISO } from "date-fns";

export default function SetupPage() {
  const router = useRouter();
  const [tripState, setTripState, isInitialized] = useLocalStorage<TripState>(
    "tripState",
    initialTripState,
    {
      migrate: migrateState,
      decodeFromUrl: decodeState,
    },
  );

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Initialize form state from tripState only once when isInitialized becomes true
  useEffect(() => {
    if (isInitialized && tripState) {
      if (tripState.startDate && tripState.endDate) {
        const newFrom = parseISO(tripState.startDate);
        const newTo = parseISO(tripState.endDate);

        if (
          !dateRange?.from ||
          !dateRange?.to ||
          newFrom.getTime() !== dateRange.from.getTime() ||
          newTo.getTime() !== dateRange.to.getTime()
        ) {
          // eslint-disable-next-line react-hooks/exhaustive-deps
          setDateRange({
            from: newFrom,
            to: newTo,
          });
        }
      }
    }
  }, [isInitialized, tripState, dateRange]);

  const handleDateChange = (range: DateRange | undefined) => {
    setDateRange(range);

    if (range?.from && range?.to) {
      const startDate = format(range.from, "yyyy-MM-dd");
      const endDate = format(range.to, "yyyy-MM-dd");

      // Check if end date is same as start date (1 day trip) or later
      // The DateRange picker allows selecting same day as start and end

      const updatedTripState = updateTripDates(
        tripState,
        startDate,
        endDate,
      );
      setTripState(updatedTripState);
      setError(null);
    }
  };

  if (!isInitialized) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Setup Trip
        </h1>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Setup Trip
        </h1>
        <p className="text-muted-foreground">
          Define the duration of your trip to get started.
        </p>
      </div>

      <Instructions text={instructions} />

      <Card>
        <CardHeader>
          <CardTitle>Trip Duration</CardTitle>
          <CardDescription>
            Select the start and end dates for your trip.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Trip Dates
            </label>
            <DatePickerWithRange
              date={dateRange}
              onDateChange={handleDateChange}
              className="w-full sm:w-[300px]"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={() => router.push("/travelers")}
              disabled={!dateRange?.from || !dateRange?.to}
              className="w-full sm:w-auto"
            >
              Continue to Travelers
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
