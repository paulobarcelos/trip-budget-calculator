"use client";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { TripState, Day } from "@/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { initialTripState } from "@/constants/initialState";
import { calculateDailyCost, getDayCount } from "@/utils/tripStateUpdates";
import { Instructions } from "@/components/Instructions";
import { instructions } from "./instructions";
import { migrateState } from "@/utils/stateMigrations";
import { decodeState } from "@/utils/stateEncoding";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO, isSameDay } from "date-fns";
import { CalendarDays, Check, Copy, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UsagePage() {
  const router = useRouter();
  const [tripState, setTripState, isInitialized] = useLocalStorage<TripState>(
    "tripState",
    initialTripState,
    {
      migrate: migrateState,
      decodeFromUrl: decodeState,
    },
  );

  const [selectedDay, setSelectedDay] = useState<Day | null>(null);
  const [activeTab, setActiveTab] = useState("daily");

  const isDateWithinRange = (date: string, start: string, end: string) =>
    Boolean(date && start && end) && date >= start && date < end;

  if (!isInitialized) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Usage
        </h1>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const handleCopyFromPreviousDay = (currentDayIndex: number) => {
    setTripState((prev) => {
      const previousDay = prev.days[currentDayIndex - 1];
      if (!previousDay) return prev;
      const previousDayExpenses = prev.usageCosts.days[previousDay.id];
      if (!previousDayExpenses) return prev;

      const cloneRecord = (record: Record<string, string[]> = {}) =>
        Object.fromEntries(
          Object.entries(record).map(([expenseId, travelerIds]) => [
            expenseId,
            [...travelerIds],
          ])
        );

      const clonedDailyShared = cloneRecord(previousDayExpenses.dailyShared);
      const clonedDailyPersonal = cloneRecord(previousDayExpenses.dailyPersonal);

      const filterForDay = (record: Record<string, string[]>) =>
        Object.fromEntries(
          Object.entries(record).map(([expenseId, travelerIds]) => [
            expenseId,
            travelerIds.filter((travelerId) => {
              const traveler = prev.travelers.find((t) => t.id === travelerId);
              const currentDay = prev.days[currentDayIndex];
              return (
                traveler &&
                isDateWithinRange(
                  currentDay.date,
                  traveler.startDate,
                  traveler.endDate
                )
              );
            }),
          ])
        );

      const filteredDailyShared = filterForDay(clonedDailyShared);
      const filteredDailyPersonal = filterForDay(clonedDailyPersonal);

      const newUsageCosts = {
        ...prev.usageCosts,
        days: {
          ...prev.usageCosts.days,
          [prev.days[currentDayIndex].id]: {
            dailyShared: filteredDailyShared,
            dailyPersonal: filteredDailyPersonal,
          },
        },
      };

      return { ...prev, usageCosts: newUsageCosts };
    });
  };

  const toggleTraveler = (
    dayId: string,
    type: "dailyShared" | "dailyPersonal",
    expenseId: string,
    travelerId: string,
    checked: boolean
  ) => {
    setTripState((prev) => {
      const currentList =
        prev.usageCosts.days[dayId]?.[type]?.[expenseId] ?? [];

      let newList;
      if (checked) {
        newList = [...currentList, travelerId];
      } else {
        newList = currentList.filter((id) => id !== travelerId);
      }

      return {
        ...prev,
        usageCosts: {
          ...prev.usageCosts,
          days: {
            ...prev.usageCosts.days,
            [dayId]: {
              ...(prev.usageCosts.days[dayId] ?? {}),
              [type]: {
                ...(prev.usageCosts.days[dayId]?.[type] ?? {}),
                [expenseId]: newList,
              },
            },
          },
        },
      };
    });
  };

  const toggleOneTimeTraveler = (
    type: "oneTimeShared" | "oneTimePersonal",
    expenseId: string,
    travelerId: string,
    checked: boolean
  ) => {
    setTripState((prev) => {
      const currentList = prev.usageCosts[type][expenseId] ?? [];

      let newList;
      if (checked) {
        newList = [...currentList, travelerId];
      } else {
        newList = currentList.filter((id) => id !== travelerId);
      }

      return {
        ...prev,
        usageCosts: {
          ...prev.usageCosts,
          [type]: {
            ...prev.usageCosts[type],
            [expenseId]: newList,
          },
        },
      };
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Usage
        </h1>
        <p className="text-muted-foreground">
          Assign expenses to travelers for each day or item.
        </p>
      </div>

      <Instructions text={instructions} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="daily">Daily Expenses</TabsTrigger>
          <TabsTrigger value="onetime">One-time Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Usage Calendar</CardTitle>
              <CardDescription>
                Select a day to assign travelers to daily expenses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tripState.days.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl border-muted-foreground/25">
                  <p className="text-muted-foreground">No days in the trip yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {tripState.days.map((day) => {
                    const dayUsage = tripState.usageCosts.days[day.id];
                    const hasUsage =
                      dayUsage &&
                      (Object.values(dayUsage.dailyShared).some(
                        (ids) => ids.length > 0
                      ) ||
                        Object.values(dayUsage.dailyPersonal).some(
                          (ids) => ids.length > 0
                        ));

                    return (
                      <Button
                        key={day.id}
                        variant={hasUsage ? "default" : "outline"}
                        className={cn(
                          "h-24 flex flex-col items-center justify-center gap-2 relative",
                          hasUsage ? "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20" : ""
                        )}
                        onClick={() => setSelectedDay(day)}
                      >
                        <span className="text-lg font-semibold">
                          {format(parseISO(day.date), "MMM d")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(day.date), "EEE")}
                        </span>
                        {hasUsage && (
                          <div className="absolute top-2 right-2">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onetime" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>One-time Shared Expenses</CardTitle>
              <CardDescription>
                Select travelers who share these expenses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {tripState.oneTimeSharedExpenses.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No one-time shared expenses.
                </p>
              ) : (
                tripState.oneTimeSharedExpenses.map((expense) => (
                  <div key={expense.id} className="space-y-3 pb-6 border-b last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{expense.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {expense.currency} {expense.totalCost.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {tripState.travelers.map((traveler) => (
                        <div key={traveler.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`ots-${expense.id}-${traveler.id}`}
                            checked={
                              tripState.usageCosts.oneTimeShared[expense.id]?.includes(
                                traveler.id
                              ) ?? false
                            }
                            onCheckedChange={(checked) =>
                              toggleOneTimeTraveler(
                                "oneTimeShared",
                                expense.id,
                                traveler.id,
                                checked as boolean
                              )
                            }
                          />
                          <Label htmlFor={`ots-${expense.id}-${traveler.id}`}>
                            {traveler.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>One-time Personal Expenses</CardTitle>
              <CardDescription>
                Select travelers who incurred these expenses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {tripState.oneTimePersonalExpenses.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No one-time personal expenses.
                </p>
              ) : (
                tripState.oneTimePersonalExpenses.map((expense) => (
                  <div key={expense.id} className="space-y-3 pb-6 border-b last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{expense.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {expense.currency} {expense.totalCost.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {tripState.travelers.map((traveler) => (
                        <div key={traveler.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`otp-${expense.id}-${traveler.id}`}
                            checked={
                              tripState.usageCosts.oneTimePersonal[expense.id]?.includes(
                                traveler.id
                              ) ?? false
                            }
                            onCheckedChange={(checked) =>
                              toggleOneTimeTraveler(
                                "oneTimePersonal",
                                expense.id,
                                traveler.id,
                                checked as boolean
                              )
                            }
                          />
                          <Label htmlFor={`otp-${expense.id}-${traveler.id}`}>
                            {traveler.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4">
        <Button
          onClick={() => router.push("/budget")}
          size="lg"
          className="w-full sm:w-auto"
        >
          Continue to Budget
        </Button>
      </div>

      <Sheet open={selectedDay !== null} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>
              {selectedDay && format(parseISO(selectedDay.date), "EEEE, MMMM d, yyyy")}
            </SheetTitle>
            <SheetDescription>
              Assign travelers to expenses for this day.
            </SheetDescription>
          </SheetHeader>

          {selectedDay && (
            <ScrollArea className="h-[calc(100vh-10rem)] mt-6 pr-4">
              <div className="space-y-8">
                {/* Copy Button */}
                {tripState.days.findIndex(d => d.id === selectedDay.id) > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleCopyFromPreviousDay(tripState.days.findIndex(d => d.id === selectedDay.id))}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy from previous day
                  </Button>
                )}

                {/* Daily Shared */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" /> Shared Expenses
                  </h3>
                  {tripState.dailySharedExpenses.filter(e =>
                    isDateWithinRange(selectedDay.date, e.startDate, e.endDate)
                  ).length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No shared expenses active today.</p>
                  ) : (
                    tripState.dailySharedExpenses
                      .filter(e => isDateWithinRange(selectedDay.date, e.startDate, e.endDate))
                      .map(expense => (
                        <Card key={expense.id}>
                          <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-base">{expense.name}</CardTitle>
                            <CardDescription>
                              {expense.currency} {calculateDailyCost(expense.totalCost, expense.startDate, expense.endDate).toFixed(2)} / day
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 pt-2 grid grid-cols-2 gap-2">
                            {tripState.travelers
                              .filter(t => isDateWithinRange(selectedDay.date, t.startDate, t.endDate))
                              .map(traveler => (
                                <div key={traveler.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`ds-${expense.id}-${traveler.id}`}
                                    checked={
                                      tripState.usageCosts.days[selectedDay.id]?.dailyShared[expense.id]?.includes(traveler.id) ?? false
                                    }
                                    onCheckedChange={(checked) =>
                                      toggleTraveler(selectedDay.id, "dailyShared", expense.id, traveler.id, checked as boolean)
                                    }
                                  />
                                  <Label htmlFor={`ds-${expense.id}-${traveler.id}`}>{traveler.name}</Label>
                                </div>
                              ))}
                          </CardContent>
                        </Card>
                      ))
                  )}
                </div>

                {/* Daily Personal */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" /> Personal Expenses
                  </h3>
                  {tripState.dailyPersonalExpenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No personal expenses defined.</p>
                  ) : (
                    tripState.dailyPersonalExpenses.map(expense => (
                      <Card key={expense.id}>
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-base">{expense.name}</CardTitle>
                          <CardDescription>
                            {expense.currency} {expense.dailyCost.toFixed(2)} / day
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 grid grid-cols-2 gap-2">
                          {tripState.travelers
                            .filter(t => isDateWithinRange(selectedDay.date, t.startDate, t.endDate))
                            .map(traveler => (
                              <div key={traveler.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`dp-${expense.id}-${traveler.id}`}
                                  checked={
                                    tripState.usageCosts.days[selectedDay.id]?.dailyPersonal[expense.id]?.includes(traveler.id) ?? false
                                  }
                                  onCheckedChange={(checked) =>
                                    toggleTraveler(selectedDay.id, "dailyPersonal", expense.id, traveler.id, checked as boolean)
                                  }
                                />
                                <Label htmlFor={`dp-${expense.id}-${traveler.id}`}>{traveler.name}</Label>
                              </div>
                            ))}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
