"use client";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { TripState } from "@/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { initialTripState } from "@/constants/initialState";
import { sortTravelers } from "@/utils/tripStateUpdates";
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

  const { budgetData, isLoading } = useTripBudget(tripState);

  const handleEditTraveler = (traveler: { id: string; name: string }) => {
    setTravelerToEdit(traveler);
    setIsAddDialogOpen(true);
  };

  const handleAddOrUpdateTraveler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

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
                    defaultValue={travelerToEdit?.name}
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

          return (
            <Card key={traveler.id}>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{traveler.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isLoading ? "Calculating..." : formatCurrency(totalAmount, tripState.displayCurrency, isApproximate)}
                  </p>
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
