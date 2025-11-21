"use client";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { TripState } from "@/types";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { initialTripState } from "@/constants/initialState";
import { sortTravelers, updateTravelerDates } from "@/utils/tripStateUpdates";
import { Instructions } from "@/components/Instructions";
import { instructions } from "./instructions";
import { shiftDate } from "@/utils/dateMath";
import { migrateState } from "@/utils/stateMigrations";
import { decodeState } from "@/utils/stateEncoding";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { Plus, Trash2 } from "lucide-react";

interface TravelerToDelete {
  id: string;
  name: string;
}

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
  const [newTravelerDateRange, setNewTravelerDateRange] = useState<DateRange | undefined>();

  const tripStart = tripState.startDate;
  const tripEnd = tripState.endDate;

  // Set default date range for new traveler to trip dates
  // Removed useEffect to avoid set-state-in-effect lint error

  if (!isInitialized) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Travelers
        </h1>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const handleAddTraveler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    if (!name.trim()) {
      setError("Traveler name is required.");
      return;
    }

    if (!newTravelerDateRange?.from || !newTravelerDateRange?.to) {
      setError("Please select travel dates.");
      return;
    }

    const startDate = format(newTravelerDateRange.from, "yyyy-MM-dd");
    const endDate = format(newTravelerDateRange.to, "yyyy-MM-dd");

    if (startDate >= endDate) {
      setError("Departure date must be after the start date.");
      return;
    }

    if (
      (tripStart && startDate < tripStart) ||
      (tripEnd && endDate > tripEnd)
    ) {
      setError("Traveler dates must stay within the trip window.");
      return;
    }

    setError(null);

    setTripState({
      ...tripState,
      travelers: sortTravelers([
        ...tripState.travelers,
        {
          id: crypto.randomUUID(),
          name,
          startDate,
          endDate,
        },
      ]),
    });

    setIsAddDialogOpen(false);
    // Reset form state
    if (tripStart && tripEnd) {
      setNewTravelerDateRange({
        from: parseISO(tripStart),
        to: parseISO(tripEnd),
      });
    }
  };

  const handleUpdateTravelerDates = (
    travelerId: string,
    range: DateRange | undefined
  ) => {
    if (!range?.from || !range?.to) return;

    const startDate = format(range.from, "yyyy-MM-dd");
    const endDate = format(range.to, "yyyy-MM-dd");

    const traveler = tripState.travelers.find((t) => t.id === travelerId);
    if (!traveler) return;

    const clampedStart =
      tripStart && startDate < tripStart ? tripStart : startDate;
    const clampedEnd =
      tripEnd && endDate > tripEnd ? tripEnd : endDate;

    if (clampedStart >= clampedEnd) {
      setError("Departure must be later than the start date.");
      return;
    }

    setError(null);

    const updatedTripState = updateTravelerDates(
      tripState,
      travelerId,
      clampedStart !== traveler.startDate ? clampedStart : null,
      clampedEnd !== traveler.endDate ? clampedEnd : null,
    );

    setTripState({
      ...updatedTripState,
      travelers: sortTravelers(updatedTripState.travelers),
    });
  };

  const handleUpdateTravelerName = (travelerId: string, name: string) => {
    const updatedTravelers = tripState.travelers.map((traveler) =>
      traveler.id === travelerId ? { ...traveler, name } : traveler
    );

    setTripState({
      ...tripState,
      travelers: sortTravelers(updatedTravelers),
    });
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
            Add everyone joining the trip and their specific dates.
          </p>
        </div>
        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (open && !newTravelerDateRange && tripStart && tripEnd) {
              setNewTravelerDateRange({
                from: parseISO(tripStart),
                to: parseISO(tripEnd),
              });
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
              <DialogTitle>Add New Traveler</DialogTitle>
              <DialogDescription>
                Enter the traveler&apos;s name and their travel dates.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddTraveler} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="e.g. Alice" />
              </div>
              <div className="space-y-2">
                <Label>Travel Dates</Label>
                <DatePickerWithRange
                  date={newTravelerDateRange}
                  onDateChange={setNewTravelerDateRange}
                  className="w-full"
                />
              </div>
              {error && (
                <div className="text-sm text-destructive bg-destructive/15 p-2 rounded">
                  {error}
                </div>
              )}
              <DialogFooter>
                <Button type="submit">Add Traveler</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Instructions text={instructions} />

      <div className="grid gap-4">
        {sortTravelers(tripState.travelers).map((traveler) => (
          <Card key={traveler.id}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-4">
                    <Input
                      value={traveler.name}
                      onChange={(e) => handleUpdateTravelerName(traveler.id, e.target.value)}
                      className="text-lg font-semibold border-transparent hover:border-input focus:border-input px-2 -ml-2 h-auto py-1 w-auto min-w-[200px]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-muted-foreground w-20">Dates:</Label>
                    <DatePickerWithRange
                      date={{
                        from: parseISO(traveler.startDate),
                        to: parseISO(traveler.endDate),
                      }}
                      onDateChange={(range) => handleUpdateTravelerDates(traveler.id, range)}
                      className="w-[300px]"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setTravelerToDelete({ id: traveler.id, name: traveler.name })}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

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

      <div className="flex justify-end pt-4">
        <Button
          onClick={() => router.push("/expenses")}
          size="lg"
          className="w-full sm:w-auto"
        >
          Continue to Expenses
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
