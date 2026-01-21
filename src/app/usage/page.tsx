"use client";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { TripState, Traveler } from "@/types";
import { initialTripState } from "@/constants/initialState";
import { migrateState } from "@/utils/stateMigrations";
import { decodeState } from "@/utils/stateEncoding";
import { UsageCalendar } from "@/components/UsageCalendar";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, isWithinInterval } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TravelerSelector } from "@/components/TravelerSelector";
import { sortTravelers } from "@/utils/tripStateUpdates";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useDayUsageStatus } from "@/hooks/useDayUsageStatus";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function UsagePage() {
  const router = useRouter();
  const [tripState, setTripState] = useLocalStorage<TripState>(
    "tripState",
    initialTripState,
    {
      migrate: migrateState,
      decodeFromUrl: decodeState,
    }
  );

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { dayStatus } = useDayUsageStatus(tripState);
  const availableDates = useMemo(
    () => Array.from(dayStatus.keys()).sort(),
    [dayStatus]
  );

  const handleDaySelect = (date: Date) => {
    setSelectedDate(date);
    setIsDialogOpen(true);
  };

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const currentIndex = dateStr ? availableDates.indexOf(dateStr) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < availableDates.length - 1;

  const handlePrevDay = () => {
    if (!hasPrev) return;
    setSelectedDate(parseISO(availableDates[currentIndex - 1]));
  };

  const handleNextDay = () => {
    if (!hasNext) return;
    setSelectedDate(parseISO(availableDates[currentIndex + 1]));
  };

  const formatOriginalCurrency = (amount: number, currency: string) =>
    `${currency} ${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}`;

  // Get expenses active on the selected date
  const activeDailyShared = useMemo(() => {
    if (!selectedDate) return [];
    return tripState.dailySharedExpenses.filter((e) =>
      isWithinInterval(selectedDate, {
        start: parseISO(e.startDate),
        end: parseISO(e.endDate),
      })
    );
  }, [tripState.dailySharedExpenses, selectedDate]);

  const activeDailyPersonal = useMemo(() => {
    if (!selectedDate) return [];
    return tripState.dailyPersonalExpenses.filter((e) =>
      isWithinInterval(selectedDate, {
        start: parseISO(e.startDate),
        end: parseISO(e.endDate),
      })
    );
  }, [tripState.dailyPersonalExpenses, selectedDate]);

  const handleUpdateDailyUsage = (
    expenseId: string,
    type: "dailyShared" | "dailyPersonal",
    travelerId: string,
    isSelected: boolean
  ) => {
    if (!dateStr) return;

    const currentDayUsage = tripState.usageCosts.days[dateStr] || {
      dailyShared: {},
      dailyPersonal: {},
    };

    const currentTravelers =
      currentDayUsage[type][expenseId] || [];

    let newTravelers: string[];
    if (isSelected) {
      newTravelers = [...currentTravelers, travelerId];
    } else {
      newTravelers = currentTravelers.filter((id) => id !== travelerId);
    }

    setTripState({
      ...tripState,
      usageCosts: {
        ...tripState.usageCosts,
        days: {
          ...tripState.usageCosts.days,
          [dateStr]: {
            ...currentDayUsage,
            [type]: {
              ...currentDayUsage[type],
              [expenseId]: newTravelers,
            },
          },
        },
      },
    });
  };

  const setDailyUsage = (
    expenseId: string,
    type: "dailyShared" | "dailyPersonal",
    travelerIds: string[]
  ) => {
    if (!dateStr) return;

    const currentDayUsage = tripState.usageCosts.days[dateStr] || {
      dailyShared: {},
      dailyPersonal: {},
    };

    setTripState({
      ...tripState,
      usageCosts: {
        ...tripState.usageCosts,
        days: {
          ...tripState.usageCosts.days,
          [dateStr]: {
            ...currentDayUsage,
            [type]: {
              ...currentDayUsage[type],
              [expenseId]: travelerIds,
            },
          },
        },
      },
    });
  };

  const handleUpdateOneTimeUsage = (
    expenseId: string,
    type: "oneTimeShared" | "oneTimePersonal",
    travelerId: string,
    isSelected: boolean
  ) => {
    const currentUsage = tripState.usageCosts[type][expenseId] || [];

    let newTravelers: string[];
    if (isSelected) {
      newTravelers = [...currentUsage, travelerId];
    } else {
      newTravelers = currentUsage.filter((id) => id !== travelerId);
    }

    setTripState({
      ...tripState,
      usageCosts: {
        ...tripState.usageCosts,
        [type]: {
          ...tripState.usageCosts[type],
          [expenseId]: newTravelers,
        },
      },
    });
  };

  const setOneTimeUsage = (
    expenseId: string,
    type: "oneTimeShared" | "oneTimePersonal",
    travelerIds: string[]
  ) => {
    setTripState({
      ...tripState,
      usageCosts: {
        ...tripState.usageCosts,
        [type]: {
          ...tripState.usageCosts[type],
          [expenseId]: travelerIds,
        },
      },
    });
  };

  const handleCreateTraveler = (name: string) => {
    const newTraveler: Traveler = {
      id: crypto.randomUUID(),
      name,
    };
    setTripState({
      ...tripState,
      travelers: sortTravelers([...tripState.travelers, newTraveler]),
    });
  };

  const handleCopyPreviousDay = () => {
    if (!selectedDate || !dateStr) return;

    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = format(prevDate, "yyyy-MM-dd");

    const prevDayUsage = tripState.usageCosts.days[prevDateStr];
    if (!prevDayUsage) return;

    const currentDayUsage = tripState.usageCosts.days[dateStr] || {
      dailyShared: {},
      dailyPersonal: {},
    };

    // Merge previous day's usage into current day
    // Only copy for expenses that are active on the current day
    const newDailyShared = { ...currentDayUsage.dailyShared };
    activeDailyShared.forEach((expense) => {
      if (prevDayUsage.dailyShared[expense.id]) {
        newDailyShared[expense.id] = prevDayUsage.dailyShared[expense.id];
      }
    });

    const newDailyPersonal = { ...currentDayUsage.dailyPersonal };
    activeDailyPersonal.forEach((expense) => {
      if (prevDayUsage.dailyPersonal[expense.id]) {
        newDailyPersonal[expense.id] = prevDayUsage.dailyPersonal[expense.id];
      }
    });

    setTripState({
      ...tripState,
      usageCosts: {
        ...tripState.usageCosts,
        days: {
          ...tripState.usageCosts.days,
          [dateStr]: {
            dailyShared: newDailyShared,
            dailyPersonal: newDailyPersonal,
          },
        },
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Usage Tracking
        </h1>
        <p className="text-muted-foreground">
          Assign expenses to travelers based on their presence.
        </p>
      </div>

      <Tabs defaultValue="daily" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="daily">Time-Bound Usage</TabsTrigger>
          <TabsTrigger value="onetime">One-off Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <UsageCalendar tripState={tripState} onDaySelect={handleDaySelect} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onetime" className="space-y-4">
          <div className="grid gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Shared One-off Expenses</h3>
              {tripState.oneTimeSharedExpenses.length === 0 && (
                <p className="text-muted-foreground text-sm">No shared one-off expenses.</p>
              )}
              {tripState.oneTimeSharedExpenses.map((expense) => (
                <Card key={expense.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex justify-between">
                      {expense.name}
                      <Badge variant="outline">
                        {formatOriginalCurrency(expense.totalCost, expense.currency)}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TravelerSelector
                      travelers={tripState.travelers}
                      selectedTravelerIds={
                        tripState.usageCosts.oneTimeShared[expense.id] || []
                      }
                      onToggleTraveler={(tId, selected) =>
                        handleUpdateOneTimeUsage(expense.id, "oneTimeShared", tId, selected)
                      }
                      onSelectAll={() =>
                        setOneTimeUsage(
                          expense.id,
                          "oneTimeShared",
                          tripState.travelers.map((traveler) => traveler.id)
                        )
                      }
                      onClearAll={() =>
                        setOneTimeUsage(expense.id, "oneTimeShared", [])
                      }
                      onCreateTraveler={handleCreateTraveler}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Individual One-off Expenses</h3>
              {tripState.oneTimePersonalExpenses.length === 0 && (
                <p className="text-muted-foreground text-sm">No individual one-off expenses.</p>
              )}
              {tripState.oneTimePersonalExpenses.map((expense) => (
                <Card key={expense.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex justify-between">
                      {expense.name}
                      <Badge variant="outline">
                        {formatOriginalCurrency(expense.totalCost, expense.currency)}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TravelerSelector
                      travelers={tripState.travelers}
                      selectedTravelerIds={
                        tripState.usageCosts.oneTimePersonal[expense.id] || []
                      }
                      onToggleTraveler={(tId, selected) =>
                        handleUpdateOneTimeUsage(expense.id, "oneTimePersonal", tId, selected)
                      }
                      onSelectAll={() =>
                        setOneTimeUsage(
                          expense.id,
                          "oneTimePersonal",
                          tripState.travelers.map((traveler) => traveler.id)
                        )
                      }
                      onClearAll={() =>
                        setOneTimeUsage(expense.id, "oneTimePersonal", [])
                      }
                      onCreateTraveler={handleCreateTraveler}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-start pt-4">
        <Button
          variant="outline"
          onClick={() => router.push("/travelers")}
          className="w-full sm:w-auto"
        >
          Back to Travelers
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader className="pr-10">
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevDay}
                disabled={!hasPrev}
                aria-label="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <DialogTitle className="text-center">
                {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a day"}
              </DialogTitle>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextDay}
                disabled={!hasNext}
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription className="text-center">
              Select who was present for each expense on this day.
            </DialogDescription>
            <div className="pt-2 flex justify-center sm:justify-start">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPreviousDay}
                disabled={!selectedDate}
              >
                Copy from Previous Day
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Shared Time-Bound Expenses
                </h3>
                {activeDailyShared.length === 0 && (
                  <p className="text-sm text-muted-foreground">No active shared time-bound expenses for this day.</p>
                )}
                {activeDailyShared.map((expense) => (
                  <div key={expense.id} className="space-y-2 border rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{expense.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {formatOriginalCurrency(expense.totalCost, expense.currency)} (Total)
                      </Badge>
                    </div>
                    <TravelerSelector
                      travelers={tripState.travelers}
                      selectedTravelerIds={
                        tripState.usageCosts.days[dateStr]?.dailyShared[expense.id] || []
                      }
                      onToggleTraveler={(tId, selected) =>
                        handleUpdateDailyUsage(expense.id, "dailyShared", tId, selected)
                      }
                      onSelectAll={() =>
                        setDailyUsage(
                          expense.id,
                          "dailyShared",
                          tripState.travelers.map((traveler) => traveler.id)
                        )
                      }
                      onClearAll={() =>
                        setDailyUsage(expense.id, "dailyShared", [])
                      }
                      onCreateTraveler={handleCreateTraveler}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Individual Time-Bound Expenses
                </h3>
                {activeDailyPersonal.length === 0 && (
                  <p className="text-sm text-muted-foreground">No active individual time-bound expenses for this day.</p>
                )}
                {activeDailyPersonal.map((expense) => (
                  <div key={expense.id} className="space-y-2 border rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{expense.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {formatOriginalCurrency(expense.dailyCost, expense.currency)}/day
                      </Badge>
                    </div>
                    <TravelerSelector
                      travelers={tripState.travelers}
                      selectedTravelerIds={
                        tripState.usageCosts.days[dateStr]?.dailyPersonal[expense.id] || []
                      }
                      onToggleTraveler={(tId, selected) =>
                        handleUpdateDailyUsage(expense.id, "dailyPersonal", tId, selected)
                      }
                      onSelectAll={() =>
                        setDailyUsage(
                          expense.id,
                          "dailyPersonal",
                          tripState.travelers.map((traveler) => traveler.id)
                        )
                      }
                      onClearAll={() =>
                        setDailyUsage(expense.id, "dailyPersonal", [])
                      }
                      onCreateTraveler={handleCreateTraveler}
                    />
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
