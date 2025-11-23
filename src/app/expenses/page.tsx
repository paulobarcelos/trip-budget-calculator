"use client";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  TripState,
  DailySharedExpense,
  DailyPersonalExpense,
  OneTimeSharedExpense,
  OneTimePersonalExpense,
} from "@/types";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { initialTripState } from "@/constants/initialState";
import { currencies } from "@/data/currencies";
import { Instructions } from "@/components/Instructions";
import { instructions } from "./instructions";
import {
  getDayCount,
  removeExpense,
} from "@/utils/tripStateUpdates";
import { shiftDate } from "@/utils/dateMath";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Trash2, Edit2, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ExpensesPage() {
  const router = useRouter();
  const [tripState, setTripState, isInitialized] = useLocalStorage<TripState>(
    "tripState",
    initialTripState,
    {
      migrate: migrateState,
      decodeFromUrl: decodeState,
    },
  );
  const [error, setError] = useState("");
  const [expenseToDelete, setExpenseToDelete] = useState<{
    id: string;
    type: "dailyShared" | "dailyPersonal" | "oneTimeShared" | "oneTimePersonal";
    name: string;
  } | null>(null);

  const [expenseToEdit, setExpenseToEdit] = useState<{
    id: string;
    type: "dailyShared" | "dailyPersonal" | "oneTimeShared" | "oneTimePersonal";
  } | null>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dailyShared");

  // Daily Shared Expense form state
  const [newDailySharedExpense, setNewDailySharedExpense] = useState({
    name: "",
    totalCost: "",
    dailyCost: "",
    startDate: tripState.startDate,
    endDate: tripState.endDate,
    currency: "USD",
    splitMode: "dailyOccupancy" as "dailyOccupancy" | "stayWeighted",
    lastEdited: "total" as "total" | "daily",
  });

  const dayCountForForm = () =>
    getDayCount(newDailySharedExpense.startDate, newDailySharedExpense.endDate);

  // Daily Personal Expense form state
  const [newDailyPersonalExpense, setNewDailyPersonalExpense] = useState({
    name: "",
    dailyCost: "",
    currency: "USD",
  });

  // One-time Shared Expense form state
  const [newOneTimeSharedExpense, setNewOneTimeSharedExpense] = useState({
    name: "",
    totalCost: "",
    currency: "USD",
  });

  // One-time Personal Expense form state
  const [newOneTimePersonalExpense, setNewOneTimePersonalExpense] = useState({
    name: "",
    totalCost: "",
    currency: "USD",
  });

  const handleAddDailySharedExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const totalCost = parseFloat(newDailySharedExpense.totalCost);
    const dayCount = getDayCount(
      newDailySharedExpense.startDate,
      newDailySharedExpense.endDate,
    );

    if (Number.isNaN(totalCost)) {
      setError("Please enter a valid cost");
      return;
    }

    if (
      !newDailySharedExpense.name.trim() ||
      !newDailySharedExpense.totalCost ||
      !newDailySharedExpense.startDate ||
      !newDailySharedExpense.endDate
    ) {
      setError("All fields are required");
      return;
    }

    if (dayCount <= 0) {
      setError("End date must be after start date");
      return;
    }

    if (
      new Date(newDailySharedExpense.startDate) <
      new Date(tripState.startDate) ||
      new Date(newDailySharedExpense.endDate) > new Date(tripState.endDate)
    ) {
      setError("Expense dates must be within trip dates");
      return;
    }

    const expense: DailySharedExpense = {
      id: crypto.randomUUID(),
      name: newDailySharedExpense.name.trim(),
      totalCost,
      startDate: newDailySharedExpense.startDate,
      endDate: newDailySharedExpense.endDate,
      currency: newDailySharedExpense.currency,
      splitMode: newDailySharedExpense.splitMode,
    };

    setTripState({
      ...tripState,
      dailySharedExpenses: [...tripState.dailySharedExpenses, expense],
    });

    resetForms();
    setIsAddDialogOpen(false);
  };

  const handleAddDailyPersonalExpense = (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    const dailyCost = parseFloat(newDailyPersonalExpense.dailyCost);
    if (isNaN(dailyCost)) {
      setError("Please enter a valid cost");
      return;
    }

    if (
      !newDailyPersonalExpense.name.trim() ||
      !newDailyPersonalExpense.dailyCost
    ) {
      setError("All fields are required");
      return;
    }

    const expense: DailyPersonalExpense = {
      id: crypto.randomUUID(),
      name: newDailyPersonalExpense.name.trim(),
      dailyCost,
      currency: newDailyPersonalExpense.currency,
    };

    setTripState({
      ...tripState,
      dailyPersonalExpenses: [...tripState.dailyPersonalExpenses, expense],
    });

    resetForms();
    setIsAddDialogOpen(false);
  };

  const handleAddOneTimeSharedExpense = (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    const totalCost = parseFloat(newOneTimeSharedExpense.totalCost);
    if (isNaN(totalCost)) {
      setError("Please enter a valid cost");
      return;
    }

    if (
      !newOneTimeSharedExpense.name.trim() ||
      !newOneTimeSharedExpense.totalCost
    ) {
      setError("All fields are required");
      return;
    }

    const expense: OneTimeSharedExpense = {
      id: crypto.randomUUID(),
      name: newOneTimeSharedExpense.name.trim(),
      totalCost,
      currency: newOneTimeSharedExpense.currency,
    };

    setTripState({
      ...tripState,
      oneTimeSharedExpenses: [...tripState.oneTimeSharedExpenses, expense],
    });

    resetForms();
    setIsAddDialogOpen(false);
  };

  const handleAddOneTimePersonalExpense = (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    const totalCost = parseFloat(newOneTimePersonalExpense.totalCost);
    if (isNaN(totalCost)) {
      setError("Please enter a valid cost");
      return;
    }

    if (
      !newOneTimePersonalExpense.name.trim() ||
      !newOneTimePersonalExpense.totalCost
    ) {
      setError("All fields are required");
      return;
    }

    const expense: OneTimePersonalExpense = {
      id: crypto.randomUUID(),
      name: newOneTimePersonalExpense.name.trim(),
      totalCost,
      currency: newOneTimePersonalExpense.currency,
    };

    setTripState({
      ...tripState,
      oneTimePersonalExpenses: [...tripState.oneTimePersonalExpenses, expense],
    });

    resetForms();
    setIsAddDialogOpen(false);
  };

  const handleDeleteExpense = () => {
    if (!expenseToDelete) return;

    setTripState((prev) =>
      removeExpense(prev, expenseToDelete.id, expenseToDelete.type),
    );
    setExpenseToDelete(null);
  };

  const resetForms = () => {
    setNewDailySharedExpense({
      name: "",
      totalCost: "",
      dailyCost: "",
      startDate: tripState.startDate,
      endDate: tripState.endDate,
      currency: "USD",
      splitMode: "dailyOccupancy",
      lastEdited: "total",
    });
    setNewDailyPersonalExpense({
      name: "",
      dailyCost: "",
      currency: "USD",
    });
    setNewOneTimeSharedExpense({
      name: "",
      totalCost: "",
      currency: "USD",
    });
    setNewOneTimePersonalExpense({
      name: "",
      totalCost: "",
      currency: "USD",
    });
    setError("");
  };

  if (!isInitialized) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Expenses
        </h1>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Expenses
          </h1>
          <p className="text-muted-foreground">
            Add and manage your trip expenses.
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add {activeTab.replace(/([A-Z])/g, ' $1').trim()}</DialogTitle>
              <DialogDescription>
                Enter the details for the new expense.
              </DialogDescription>
            </DialogHeader>

            {activeTab === "dailyShared" && (
              <form onSubmit={handleAddDailySharedExpense} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newDailySharedExpense.name}
                    onChange={(e) => setNewDailySharedExpense({ ...newDailySharedExpense, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalCost">Total Cost</Label>
                    <Input
                      id="totalCost"
                      type="number"
                      step="0.01"
                      value={newDailySharedExpense.totalCost}
                      onChange={(e) => setNewDailySharedExpense({ ...newDailySharedExpense, totalCost: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={newDailySharedExpense.currency}
                      onValueChange={(value) => setNewDailySharedExpense({ ...newDailySharedExpense, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <DatePickerWithRange
                    date={{
                      from: newDailySharedExpense.startDate ? parseISO(newDailySharedExpense.startDate) : undefined,
                      to: newDailySharedExpense.endDate ? parseISO(newDailySharedExpense.endDate) : undefined,
                    }}
                    onDateChange={(range) => {
                      if (range?.from && range?.to) {
                        setNewDailySharedExpense({
                          ...newDailySharedExpense,
                          startDate: format(range.from, "yyyy-MM-dd"),
                          endDate: format(range.to, "yyyy-MM-dd"),
                        });
                      }
                    }}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Split Mode</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={newDailySharedExpense.splitMode === "dailyOccupancy"}
                        onChange={() => setNewDailySharedExpense({ ...newDailySharedExpense, splitMode: "dailyOccupancy" })}
                        className="accent-primary-600"
                      />
                      Daily Occupancy
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={newDailySharedExpense.splitMode === "stayWeighted"}
                        onChange={() => setNewDailySharedExpense({ ...newDailySharedExpense, splitMode: "stayWeighted" })}
                        className="accent-primary-600"
                      />
                      Even-day Split
                    </label>
                  </div>
                </div>
                {error && <div className="text-sm text-destructive">{error}</div>}
                <DialogFooter>
                  <Button type="submit">Add Expense</Button>
                </DialogFooter>
              </form>
            )}

            {activeTab === "dailyPersonal" && (
              <form onSubmit={handleAddDailyPersonalExpense} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newDailyPersonalExpense.name}
                    onChange={(e) => setNewDailyPersonalExpense({ ...newDailyPersonalExpense, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dailyCost">Daily Cost</Label>
                    <Input
                      id="dailyCost"
                      type="number"
                      step="0.01"
                      value={newDailyPersonalExpense.dailyCost}
                      onChange={(e) => setNewDailyPersonalExpense({ ...newDailyPersonalExpense, dailyCost: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={newDailyPersonalExpense.currency}
                      onValueChange={(value) => setNewDailyPersonalExpense({ ...newDailyPersonalExpense, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {error && <div className="text-sm text-destructive">{error}</div>}
                <DialogFooter>
                  <Button type="submit">Add Expense</Button>
                </DialogFooter>
              </form>
            )}

            {activeTab === "oneTimeShared" && (
              <form onSubmit={handleAddOneTimeSharedExpense} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newOneTimeSharedExpense.name}
                    onChange={(e) => setNewOneTimeSharedExpense({ ...newOneTimeSharedExpense, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalCost">Total Cost</Label>
                    <Input
                      id="totalCost"
                      type="number"
                      step="0.01"
                      value={newOneTimeSharedExpense.totalCost}
                      onChange={(e) => setNewOneTimeSharedExpense({ ...newOneTimeSharedExpense, totalCost: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={newOneTimeSharedExpense.currency}
                      onValueChange={(value) => setNewOneTimeSharedExpense({ ...newOneTimeSharedExpense, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {error && <div className="text-sm text-destructive">{error}</div>}
                <DialogFooter>
                  <Button type="submit">Add Expense</Button>
                </DialogFooter>
              </form>
            )}

            {activeTab === "oneTimePersonal" && (
              <form onSubmit={handleAddOneTimePersonalExpense} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newOneTimePersonalExpense.name}
                    onChange={(e) => setNewOneTimePersonalExpense({ ...newOneTimePersonalExpense, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalCost">Total Cost</Label>
                    <Input
                      id="totalCost"
                      type="number"
                      step="0.01"
                      value={newOneTimePersonalExpense.totalCost}
                      onChange={(e) => setNewOneTimePersonalExpense({ ...newOneTimePersonalExpense, totalCost: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={newOneTimePersonalExpense.currency}
                      onValueChange={(value) => setNewOneTimePersonalExpense({ ...newOneTimePersonalExpense, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {error && <div className="text-sm text-destructive">{error}</div>}
                <DialogFooter>
                  <Button type="submit">Add Expense</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Instructions text={instructions} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="dailyShared">Daily Shared</TabsTrigger>
          <TabsTrigger value="dailyPersonal">Daily Personal</TabsTrigger>
          <TabsTrigger value="oneTimeShared">One-time Shared</TabsTrigger>
          <TabsTrigger value="oneTimePersonal">One-time Personal</TabsTrigger>
        </TabsList>

        <TabsContent value="dailyShared" className="space-y-4">
          <div className="grid gap-4">
            {tripState.dailySharedExpenses.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl border-muted-foreground/25">
                <p className="text-muted-foreground">No daily shared expenses added yet.</p>
              </div>
            ) : (
              tripState.dailySharedExpenses.map((expense) => (
                <Card key={expense.id}>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{expense.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {expense.currency} {expense.totalCost.toFixed(2)} total • {expense.splitMode === 'dailyOccupancy' ? 'Daily Occupancy' : 'Even Split'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(expense.startDate), "MMM d")} - {format(parseISO(expense.endDate), "MMM d")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setExpenseToDelete({ id: expense.id, type: "dailyShared", name: expense.name })}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="dailyPersonal" className="space-y-4">
          <div className="grid gap-4">
            {tripState.dailyPersonalExpenses.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl border-muted-foreground/25">
                <p className="text-muted-foreground">No daily personal expenses added yet.</p>
              </div>
            ) : (
              tripState.dailyPersonalExpenses.map((expense) => (
                <Card key={expense.id}>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{expense.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {expense.currency} {expense.dailyCost.toFixed(2)} / day
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setExpenseToDelete({ id: expense.id, type: "dailyPersonal", name: expense.name })}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="oneTimeShared" className="space-y-4">
          <div className="grid gap-4">
            {tripState.oneTimeSharedExpenses.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl border-muted-foreground/25">
                <p className="text-muted-foreground">No one-time shared expenses added yet.</p>
              </div>
            ) : (
              tripState.oneTimeSharedExpenses.map((expense) => (
                <Card key={expense.id}>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{expense.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {expense.currency} {expense.totalCost.toFixed(2)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setExpenseToDelete({ id: expense.id, type: "oneTimeShared", name: expense.name })}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="oneTimePersonal" className="space-y-4">
          <div className="grid gap-4">
            {tripState.oneTimePersonalExpenses.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl border-muted-foreground/25">
                <p className="text-muted-foreground">No one-time personal expenses added yet.</p>
              </div>
            ) : (
              tripState.oneTimePersonalExpenses.map((expense) => (
                <Card key={expense.id}>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{expense.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {expense.currency} {expense.totalCost.toFixed(2)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setExpenseToDelete({ id: expense.id, type: "oneTimePersonal", name: expense.name })}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4">
        <Button
          onClick={() => router.push("/usage")}
          size="lg"
          className="w-full sm:w-auto"
        >
          Continue to Usage
        </Button>
      </div>

      <ConfirmationDialog
        isOpen={expenseToDelete !== null}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={handleDeleteExpense}
        title="Delete Expense"
        message={`Are you sure you want to delete ${expenseToDelete?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
}
