"use client";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { TripState } from "@/types";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { initialTripState } from "@/constants/initialState";
import { getDayCount, sortTravelers } from "@/utils/tripStateUpdates";
import { Instructions } from "@/components/Instructions";
import { instructions } from "./instructions";
import { migrateState } from "@/utils/stateMigrations";
import { decodeState } from "@/utils/stateEncoding";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { currencies } from "@/data/currencies";
import { Plus, Trash2, Edit2 } from "lucide-react";

interface TravelerToDelete {
  id: string;
  name: string;
}

import { useTripBudget } from "@/hooks/useTripBudget";
import { formatCurrency } from "@/utils/currencyFormatting";
import { addDays, format, parseISO } from "date-fns";

export default function TravelersPage() {
  const router = useRouter();
  const [tripState, setTripState, isInitialized] = useLocalStorage<TripState>(
    "tripState",
    initialTripState,
    {
      migrate: migrateState,
      decodeFromUrl: decodeState,
    },
  );
  const [travelerToDelete, setTravelerToDelete] =
    useState<TravelerToDelete | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [travelerToEdit, setTravelerToEdit] = useState<{ id: string; name: string } | null>(null);
  const [nameInput, setNameInput] = useState("");
  const nextTravelerName = useMemo(
    () => `Traveller ${tripState.travelers.length + 1}`,
    [tripState.travelers.length],
  );

  const { budgetData, isLoading } = useTripBudget(tripState);

  const participationByTraveler = useMemo(() => {
    type ParticipationEntry = {
      id: string;
      name: string;
      startDate?: string;
      endDate?: string;
      amount: number;
      currency: string;
    };

    const participation = new Map<string, ParticipationEntry[]>();
    tripState.travelers.forEach((traveler) => {
      participation.set(traveler.id, []);
    });

    const addEntry = (travelerId: string, entry: ParticipationEntry) => {
      const list = participation.get(travelerId);
      if (!list) return;
      list.push(entry);
    };

    const buildRanges = (
      expenseId: string,
      name: string,
      currency: string,
      costByDate: Map<string, number>,
    ): ParticipationEntry[] => {
      const dates = Array.from(costByDate.keys()).sort();
      const ranges: ParticipationEntry[] = [];
      let currentStart = "";
      let currentEnd = "";
      let currentSum = 0;
      let prevDate: Date | null = null;

      dates.forEach((dateStr) => {
        const cost = costByDate.get(dateStr) ?? 0;
        const date = parseISO(dateStr);
        if (!currentStart) {
          currentStart = dateStr;
          currentEnd = dateStr;
          currentSum = cost;
          prevDate = date;
          return;
        }

        const expectedNext = prevDate ? addDays(prevDate, 1) : null;
        if (expectedNext && format(expectedNext, "yyyy-MM-dd") === dateStr) {
          currentEnd = dateStr;
          currentSum += cost;
          prevDate = date;
          return;
        }

        ranges.push({
          id: `${expenseId}-${currentStart}-${currentEnd}`,
          name,
          startDate: currentStart,
          endDate: currentEnd,
          amount: currentSum,
          currency,
        });

        currentStart = dateStr;
        currentEnd = dateStr;
        currentSum = cost;
        prevDate = date;
      });

      if (currentStart) {
        ranges.push({
          id: `${expenseId}-${currentStart}-${currentEnd}`,
          name,
          startDate: currentStart,
          endDate: currentEnd,
          amount: currentSum,
          currency,
        });
      }

      return ranges;
    };

    tripState.dailySharedExpenses.forEach((expense) => {
      const relevantDays = Object.entries(tripState.usageCosts.days)
        .filter(([dateStr]) => dateStr >= expense.startDate && dateStr < expense.endDate)
        .map(([dateStr, dayUsage]) => ({
          dateStr,
          travelerIds: dayUsage.dailyShared[expense.id] || [],
        }))
        .filter(({ travelerIds }) => travelerIds.length > 0);

      if (relevantDays.length === 0) return;

      const costByTravelerDate = new Map<string, Map<string, number>>();
      const addCost = (travelerId: string, dateStr: string, amount: number) => {
        if (!costByTravelerDate.has(travelerId)) {
          costByTravelerDate.set(travelerId, new Map());
        }
        const perTraveler = costByTravelerDate.get(travelerId)!;
        perTraveler.set(dateStr, (perTraveler.get(dateStr) ?? 0) + amount);
      };

      if (expense.splitMode === "stayWeighted") {
        const totalNights = relevantDays.reduce(
          (sum, day) => sum + day.travelerIds.length,
          0
        );
        if (totalNights === 0) return;
        const perNight = expense.totalCost / totalNights;

        relevantDays.forEach(({ dateStr, travelerIds }) => {
          travelerIds.forEach((travelerId) => {
            addCost(travelerId, dateStr, perNight);
          });
        });
      } else {
        const dayCount = getDayCount(expense.startDate, expense.endDate);
        const dailyCost = dayCount > 0 ? expense.totalCost / dayCount : expense.totalCost;
        relevantDays.forEach(({ dateStr, travelerIds }) => {
          const perPerson = dailyCost / travelerIds.length;
          travelerIds.forEach((travelerId) => {
            addCost(travelerId, dateStr, perPerson);
          });
        });
      }

      costByTravelerDate.forEach((costByDate, travelerId) => {
        const ranges = buildRanges(expense.id, expense.name, expense.currency, costByDate);
        ranges.forEach((entry) => addEntry(travelerId, entry));
      });
    });

    tripState.dailyPersonalExpenses.forEach((expense) => {
      const costByTravelerDate = new Map<string, Map<string, number>>();
      const addCost = (travelerId: string, dateStr: string, amount: number) => {
        if (!costByTravelerDate.has(travelerId)) {
          costByTravelerDate.set(travelerId, new Map());
        }
        const perTraveler = costByTravelerDate.get(travelerId)!;
        perTraveler.set(dateStr, (perTraveler.get(dateStr) ?? 0) + amount);
      };

      Object.entries(tripState.usageCosts.days)
        .filter(([dateStr]) => dateStr >= expense.startDate && dateStr < expense.endDate)
        .forEach(([dateStr, dayUsage]) => {
          const travelerIds = dayUsage.dailyPersonal[expense.id] || [];
          travelerIds.forEach((travelerId) => {
            addCost(travelerId, dateStr, expense.dailyCost);
          });
        });

      costByTravelerDate.forEach((costByDate, travelerId) => {
        const ranges = buildRanges(expense.id, expense.name, expense.currency, costByDate);
        ranges.forEach((entry) => addEntry(travelerId, entry));
      });
    });

    tripState.oneTimeSharedExpenses.forEach((expense) => {
      const travelerIds = tripState.usageCosts.oneTimeShared[expense.id] || [];
      if (travelerIds.length === 0) return;
      const costPerPerson = expense.totalCost / travelerIds.length;
      travelerIds.forEach((travelerId) => {
        addEntry(travelerId, {
          id: `${expense.id}-one-time`,
          name: expense.name,
          amount: costPerPerson,
          currency: expense.currency,
        });
      });
    });

    tripState.oneTimePersonalExpenses.forEach((expense) => {
      const travelerIds = tripState.usageCosts.oneTimePersonal[expense.id] || [];
      travelerIds.forEach((travelerId) => {
        addEntry(travelerId, {
          id: `${expense.id}-one-time`,
          name: expense.name,
          amount: expense.totalCost,
          currency: expense.currency,
        });
      });
    });

    return new Map(
      Array.from(participation.entries()).map(([travelerId, entries]) => [
        travelerId,
        entries.sort((a, b) => {
          if (a.startDate && b.startDate) {
            return a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name);
          }
          if (a.startDate) return -1;
          if (b.startDate) return 1;
          return a.name.localeCompare(b.name);
        }),
      ])
    );
  }, [tripState]);

  const handleEditTraveler = (traveler: { id: string; name: string }) => {
    setTravelerToEdit(traveler);
    setNameInput(traveler.name);
    setIsAddDialogOpen(true);
  };

  const handleAddOrUpdateTraveler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = nameInput;

    if (!name.trim()) {
      setError("Traveler name is required.");
      return;
    }

    setError(null);

    if (travelerToEdit) {
      const updatedTravelers = tripState.travelers.map((t) =>
        t.id === travelerToEdit.id ? { ...t, name } : t
      );

      setTripState({
        ...tripState,
        travelers: sortTravelers(updatedTravelers),
      });
    } else {
      setTripState({
        ...tripState,
        travelers: sortTravelers([
          ...tripState.travelers,
          {
            id: crypto.randomUUID(),
            name,
          },
        ]),
      });
    }

    setIsAddDialogOpen(false);
    setTravelerToEdit(null);
  };

  const handleRemoveTraveler = (travelerId: string) => {
    const validTravelerIds = new Set(
      tripState.travelers.filter((t) => t.id !== travelerId).map((t) => t.id),
    );

    const cleanedDays = Object.fromEntries(
      Object.entries(tripState.usageCosts.days).map(([dayId, daily]) => {
        const dailyShared = Object.fromEntries(
          Object.entries(daily.dailyShared)
            .map(([expenseId, ids]) => [
              expenseId,
              ids.filter((id) => validTravelerIds.has(id)),
            ])
            .filter(([, ids]) => ids.length > 0),
        );

        const dailyPersonal = Object.fromEntries(
          Object.entries(daily.dailyPersonal)
            .map(([expenseId, ids]) => [
              expenseId,
              ids.filter((id) => validTravelerIds.has(id)),
            ])
            .filter(([, ids]) => ids.length > 0),
        );

        return [dayId, { dailyShared, dailyPersonal }];
      }),
    );

    const cleanedOneTimeShared = Object.fromEntries(
      Object.entries(tripState.usageCosts.oneTimeShared)
        .map(([expenseId, ids]) => [
          expenseId,
          ids.filter((id) => validTravelerIds.has(id)),
        ])
        .filter(([, ids]) => ids.length > 0),
    );

    const cleanedOneTimePersonal = Object.fromEntries(
      Object.entries(tripState.usageCosts.oneTimePersonal)
        .map(([expenseId, ids]) => [
          expenseId,
          ids.filter((id) => validTravelerIds.has(id)),
        ])
        .filter(([, ids]) => ids.length > 0),
    );

    setTripState({
      ...tripState,
      travelers: sortTravelers(
        tripState.travelers.filter((t) => t.id !== travelerId),
      ),
      usageCosts: {
        oneTimeShared: cleanedOneTimeShared,
        oneTimePersonal: cleanedOneTimePersonal,
        days: cleanedDays,
      },
    });
  };



  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Travelers
          </h1>
          <p className="text-muted-foreground">
            Manage your travel group. Total costs are calculated automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) {
                setTravelerToEdit(null);
                setNameInput("");
                setError(null);
              } else if (!travelerToEdit) {
                setNameInput(nextTravelerName);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Traveler
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{travelerToEdit ? "Edit Traveler" : "Add New Traveler"}</DialogTitle>
                <DialogDescription>
                  {travelerToEdit ? "Update the traveler's details." : "Enter the traveler's name."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddOrUpdateTraveler} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    placeholder="e.g. Alice"
                    value={nameInput}
                    onChange={(event) => setNameInput(event.target.value)}
                  />
                </div>
                {error && (
                  <div className="text-sm text-destructive bg-destructive/15 p-2 rounded">
                    {error}
                  </div>
                )}
                <DialogFooter>
                  <Button type="submit">{travelerToEdit ? "Update Traveler" : "Add Traveler"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4">
        {sortTravelers(tripState.travelers).map((traveler) => {
          const costs = budgetData?.travelerCosts.get(traveler.id);
          const totalAmount = costs?.total.amount || 0;
          const isApproximate = costs?.total.isApproximate || false;
          const participation = participationByTraveler.get(traveler.id) || [];
          return (
            <Card key={traveler.id}>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{traveler.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isLoading ? "Calculating..." : formatCurrency(totalAmount, tripState.displayCurrency, isApproximate)}
                  </p>
                  {participation.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {participation.map((entry, index) => (
                        <span key={entry.id}>
                          {index > 0 ? " • " : ""}
                          <span className="font-semibold">{entry.name}</span>{" "}
                          {formatCurrency(entry.amount, entry.currency, false)}
                          {entry.startDate && entry.endDate && (
                            <>
                              {" "}
                              <span className="italic">
                                ({format(parseISO(entry.startDate), "dd-MM")} →{" "}
                                {format(parseISO(entry.endDate), "dd-MM")})
                              </span>
                            </>
                          )}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => handleEditTraveler(traveler)}
                    aria-label="Edit"
                  >
                    <Edit2 className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setTravelerToDelete({ id: traveler.id, name: traveler.name })}
                    aria-label="Remove"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {tripState.travelers.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed rounded-xl border-muted-foreground/25">
            <p className="text-muted-foreground">No travelers added yet.</p>
            <Button
              variant="link"
              onClick={() => setIsAddDialogOpen(true)}
              className="mt-2"
            >
              Add your first traveler
            </Button>
          </div>
        )}
      </div>

      {budgetData && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Grand Total</h3>
              <p className="text-sm text-muted-foreground">
                Total estimated cost for the entire trip
              </p>
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(budgetData.grandTotal.amount, tripState.displayCurrency, budgetData.grandTotal.isApproximate)}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-between">
        <Button
          variant="outline"
          onClick={() => router.push("/expenses")}
          size="lg"
          className="w-full sm:w-auto"
        >
          Back to Expenses
        </Button>
        <Button
          onClick={() => router.push("/usage")}
          size="lg"
          className="w-full sm:w-auto"
        >
          Continue to Usage
        </Button>
      </div>

      <ConfirmationDialog
        isOpen={travelerToDelete !== null}
        onClose={() => setTravelerToDelete(null)}
        onConfirm={() => handleRemoveTraveler(travelerToDelete!.id)}
        title="Remove Traveler"
        message={`Are you sure you want to remove ${travelerToDelete?.name}? This action cannot be undone.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
      />
    </div>
  );
}
