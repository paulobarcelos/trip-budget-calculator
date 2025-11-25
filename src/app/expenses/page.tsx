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
import { InfoTooltip } from "@/components/InfoTooltip";
import {
  getDayCount,
  removeExpense,
} from "@/utils/tripStateUpdates";
import { migrateState } from "@/utils/stateMigrations";
import { decodeState } from "@/utils/stateEncoding";
import { useDisplayCurrency } from "@/providers/DisplayCurrencyProvider";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencySelect } from "@/components/CurrencySelect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { UnifiedExpenseCreator, ExpenseCreationData } from "@/components/UnifiedExpenseCreator";

import { getTripDateRange } from "@/utils/tripDates";

type ExpenseType = "dailyShared" | "dailyPersonal" | "oneTimeShared" | "oneTimePersonal";

export default function ExpensesPage() {
  const router = useRouter();
  const { displayCurrency } = useDisplayCurrency();
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
    type: ExpenseType;
    name: string;
  } | null>(null);

  const [expenseToEdit, setExpenseToEdit] = useState<{
    id: string;
    type: ExpenseType;
  } | null>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUnifiedCreatorOpen, setIsUnifiedCreatorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("daily");
  const [dialogExpenseType, setDialogExpenseType] = useState<ExpenseType>("dailyShared");

  const { startDate: derivedStartDate, endDate: derivedEndDate } = useMemo(
    () => getTripDateRange(tripState),
    [tripState]
  );

  const defaultStartDate = derivedStartDate || format(new Date(), "yyyy-MM-dd");
  const defaultEndDate = derivedEndDate || format(new Date(), "yyyy-MM-dd");

  // Daily Shared Expense form state
  const [newDailySharedExpense, setNewDailySharedExpense] = useState({
    name: "",
    totalCost: "",
    dailyCost: "",
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    currency: displayCurrency,
    splitMode: "dailyOccupancy" as "dailyOccupancy" | "stayWeighted",
    lastEdited: "total" as "total" | "daily",
  });

  // Daily Personal Expense form state
  const [newDailyPersonalExpense, setNewDailyPersonalExpense] = useState({
    name: "",
    dailyCost: "",
    currency: displayCurrency,
    startDate: defaultStartDate,
    endDate: defaultEndDate,
  });

  // One-time Shared Expense form state
  const [newOneTimeSharedExpense, setNewOneTimeSharedExpense] = useState({
    name: "",
    totalCost: "",
    currency: displayCurrency,
  });

  // One-time Personal Expense form state
  const [newOneTimePersonalExpense, setNewOneTimePersonalExpense] = useState({
    name: "",
    totalCost: "",
    currency: displayCurrency,
  });

  const handleOpenAddDialog = (type: ExpenseType) => {
    setDialogExpenseType(type);
    resetForms();
    // Update dates to defaults just in case
    setNewDailySharedExpense(prev => ({ ...prev, startDate: defaultStartDate, endDate: defaultEndDate }));
    setNewDailyPersonalExpense(prev => ({ ...prev, startDate: defaultStartDate, endDate: defaultEndDate }));
    setIsAddDialogOpen(true);
  };

  const handleEditExpense = (
    expense:
      | DailySharedExpense
      | DailyPersonalExpense
      | OneTimeSharedExpense
      | OneTimePersonalExpense,
    type: ExpenseType,
  ) => {
    setExpenseToEdit({ id: expense.id, type });
    setDialogExpenseType(type);

    if (type.startsWith("daily")) {
      setActiveTab("daily");
    } else {
      setActiveTab("onetime");
    }

    if (type === "dailyShared") {
      const e = expense as DailySharedExpense;
      setNewDailySharedExpense({
        name: e.name,
        totalCost: e.totalCost.toString(),
        dailyCost: "",
        startDate: e.startDate,
        endDate: e.endDate,
        currency: e.currency,
        splitMode: e.splitMode,
        lastEdited: "total",
      });
    } else if (type === "dailyPersonal") {
      const e = expense as DailyPersonalExpense;
      setNewDailyPersonalExpense({
        name: e.name,
        dailyCost: e.dailyCost.toString(),
        currency: e.currency,
        startDate: e.startDate,
        endDate: e.endDate,
      });
    } else if (type === "oneTimeShared") {
      const e = expense as OneTimeSharedExpense;
      setNewOneTimeSharedExpense({
        name: e.name,
        totalCost: e.totalCost.toString(),
        currency: e.currency,
      });
    } else if (type === "oneTimePersonal") {
      const e = expense as OneTimePersonalExpense;
      setNewOneTimePersonalExpense({
        name: e.name,
        totalCost: e.totalCost.toString(),
        currency: e.currency,
      });
    }

    setIsAddDialogOpen(true);
  };

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

    if (expenseToEdit && expenseToEdit.type === "dailyShared") {
      setTripState((prev) => ({
        ...prev,
        dailySharedExpenses: prev.dailySharedExpenses.map((exp) =>
          exp.id === expenseToEdit.id
            ? {
              ...exp,
              name: newDailySharedExpense.name.trim(),
              totalCost,
              startDate: newDailySharedExpense.startDate,
              endDate: newDailySharedExpense.endDate,
              currency: newDailySharedExpense.currency,
              splitMode: newDailySharedExpense.splitMode,
            }
            : exp,
        ),
      }));
    } else {
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
    }

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
      !newDailyPersonalExpense.dailyCost ||
      !newDailyPersonalExpense.startDate ||
      !newDailyPersonalExpense.endDate
    ) {
      setError("All fields are required");
      return;
    }

    if (expenseToEdit && expenseToEdit.type === "dailyPersonal") {
      setTripState((prev) => ({
        ...prev,
        dailyPersonalExpenses: prev.dailyPersonalExpenses.map((exp) =>
          exp.id === expenseToEdit.id
            ? {
              ...exp,
              name: newDailyPersonalExpense.name.trim(),
              dailyCost,
              currency: newDailyPersonalExpense.currency,
              startDate: newDailyPersonalExpense.startDate,
              endDate: newDailyPersonalExpense.endDate,
            }
            : exp,
        ),
      }));
    } else {
      const expense: DailyPersonalExpense = {
        id: crypto.randomUUID(),
        name: newDailyPersonalExpense.name.trim(),
        dailyCost,
        currency: newDailyPersonalExpense.currency,
        startDate: newDailyPersonalExpense.startDate,
        endDate: newDailyPersonalExpense.endDate,
      };

      setTripState({
        ...tripState,
        dailyPersonalExpenses: [...tripState.dailyPersonalExpenses, expense],
      });
    }

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

    if (expenseToEdit && expenseToEdit.type === "oneTimeShared") {
      setTripState((prev) => ({
        ...prev,
        oneTimeSharedExpenses: prev.oneTimeSharedExpenses.map((exp) =>
          exp.id === expenseToEdit.id
            ? {
              ...exp,
              name: newOneTimeSharedExpense.name.trim(),
              totalCost,
              currency: newOneTimeSharedExpense.currency,
            }
            : exp,
        ),
      }));
    } else {
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
    }

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

    if (expenseToEdit && expenseToEdit.type === "oneTimePersonal") {
      setTripState((prev) => ({
        ...prev,
        oneTimePersonalExpenses: prev.oneTimePersonalExpenses.map((exp) =>
          exp.id === expenseToEdit.id
            ? {
              ...exp,
              name: newOneTimePersonalExpense.name.trim(),
              totalCost,
              currency: newOneTimePersonalExpense.currency,
            }
            : exp,
        ),
      }));
    } else {
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
    }

    resetForms();
    setIsAddDialogOpen(false);
  };

  const handleSaveUnifiedExpense = (data: ExpenseCreationData) => {
    const { name, isDaily, startDate, endDate, currency, totalCost, isShared, splitMode } = data;

    if (isDaily) {
      if (!startDate || !endDate) return; // Should be handled by validator but safety check

      if (isShared) {
        // Daily Shared
        const expense: DailySharedExpense = {
          id: crypto.randomUUID(),
          name,
          totalCost,
          startDate,
          endDate,
          currency,
          splitMode: splitMode || "dailyOccupancy",
        };
        setTripState(prev => ({
          ...prev,
          dailySharedExpenses: [...prev.dailySharedExpenses, expense]
        }));
      } else {
        // Daily Personal
        // For personal daily, we need dailyCost.
        // The unified creator returns totalCost.
        // We need to calculate dailyCost.
        const dayCount = getDayCount(startDate, endDate);
        const safeDays = dayCount > 0 ? dayCount : 1;
        const dailyCost = totalCost / safeDays;

        const expense: DailyPersonalExpense = {
          id: crypto.randomUUID(),
          name,
          dailyCost,
          startDate,
          endDate,
          currency,
        };
        setTripState(prev => ({
          ...prev,
          dailyPersonalExpenses: [...prev.dailyPersonalExpenses, expense]
        }));
      }
    } else {
      // One Time
      if (isShared) {
        // One Time Shared
        const expense: OneTimeSharedExpense = {
          id: crypto.randomUUID(),
          name,
          totalCost,
          currency,
        };
        setTripState(prev => ({
          ...prev,
          oneTimeSharedExpenses: [...prev.oneTimeSharedExpenses, expense]
        }));
      } else {
        // One Time Personal
        const expense: OneTimePersonalExpense = {
          id: crypto.randomUUID(),
          name,
          totalCost,
          currency,
        };
        setTripState(prev => ({
          ...prev,
          oneTimePersonalExpenses: [...prev.oneTimePersonalExpenses, expense]
        }));
      }
    }

    setIsUnifiedCreatorOpen(false);
  };

  const handleDeleteExpense = () => {
    if (!expenseToDelete) return;

    setTripState((prev) =>
      removeExpense(prev, expenseToDelete.id, expenseToDelete.type),
    );
    setExpenseToDelete(null);
  };

  const resetForms = () => {
    setExpenseToEdit(null);
    setNewDailySharedExpense({
      name: "",
      totalCost: "",
      dailyCost: "",
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      currency: displayCurrency,
      splitMode: "dailyOccupancy",
      lastEdited: "total",
    });
    setNewDailyPersonalExpense({
      name: "",
      dailyCost: "",
      currency: displayCurrency,
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    });
    setNewOneTimeSharedExpense({
      name: "",
      totalCost: "",
      currency: displayCurrency,
    });
    setNewOneTimePersonalExpense({
      name: "",
      totalCost: "",
      currency: displayCurrency,
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
            Log all your trip expenses here. Dates are automatically inferred.
          </p>
        </div>
        <Button onClick={() => setIsUnifiedCreatorOpen(true)} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="daily">Daily Expenses</TabsTrigger>
          <TabsTrigger value="onetime">One-time Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-8">
          {/* Shared Daily Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  Shared Daily Expenses
                  <InfoTooltip content="Recurring costs split among the group (e.g., Hotels, Car Rental)." />
                </h2>
                <p className="text-sm text-muted-foreground">Expenses that occur every day and are shared.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tripState.dailySharedExpenses.length === 0 ? (
                <div className="col-span-full text-center py-8 border-2 border-dashed rounded-xl border-muted-foreground/25">
                  <p className="text-muted-foreground">No shared daily expenses.</p>
                </div>
              ) : (
                tripState.dailySharedExpenses.map((expense) => (
                  <Card key={expense.id}>
                    <CardContent className="p-6 flex flex-col justify-between h-full gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">{expense.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {expense.currency} {expense.totalCost.toFixed(2)} total • {expense.splitMode === 'dailyOccupancy' ? 'Daily Occupancy' : 'Even Split'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(expense.startDate), "MMM d")} - {format(parseISO(expense.endDate), "MMM d")}
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary"
                          onClick={() => handleEditExpense(expense, "dailyShared")}
                          aria-label="Edit expense"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setExpenseToDelete({ id: expense.id, type: "dailyShared", name: expense.name })}
                          aria-label="Delete expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Personal Daily Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  Personal Daily Expenses
                  <InfoTooltip content="Recurring costs for individuals (e.g., Daily Food Allowance)." />
                </h2>
                <p className="text-sm text-muted-foreground">Expenses that occur every day for a specific person.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tripState.dailyPersonalExpenses.length === 0 ? (
                <div className="col-span-full text-center py-8 border-2 border-dashed rounded-xl border-muted-foreground/25">
                  <p className="text-muted-foreground">No personal daily expenses.</p>
                </div>
              ) : (
                tripState.dailyPersonalExpenses.map((expense) => (
                  <Card key={expense.id}>
                    <CardContent className="p-6 flex flex-col justify-between h-full gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">{expense.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {expense.currency} {expense.dailyCost.toFixed(2)} / day
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(expense.startDate), "MMM d")} - {format(parseISO(expense.endDate), "MMM d")}
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary"
                          onClick={() => handleEditExpense(expense, "dailyPersonal")}
                          aria-label="Edit expense"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setExpenseToDelete({ id: expense.id, type: "dailyPersonal", name: expense.name })}
                          aria-label="Delete expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="onetime" className="space-y-8">
          {/* Shared One-Time Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  Shared One-Time Expenses
                  <InfoTooltip content="Single costs split among the group (e.g., Group Dinner, Tickets)." />
                </h2>
                <p className="text-sm text-muted-foreground">One-off expenses shared by the group.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tripState.oneTimeSharedExpenses.length === 0 ? (
                <div className="col-span-full text-center py-8 border-2 border-dashed rounded-xl border-muted-foreground/25">
                  <p className="text-muted-foreground">No shared one-time expenses.</p>
                </div>
              ) : (
                tripState.oneTimeSharedExpenses.map((expense) => (
                  <Card key={expense.id}>
                    <CardContent className="p-6 flex flex-col justify-between h-full gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">{expense.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {expense.currency} {expense.totalCost.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary"
                          onClick={() => handleEditExpense(expense, "oneTimeShared")}
                          aria-label="Edit expense"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setExpenseToDelete({ id: expense.id, type: "oneTimeShared", name: expense.name })}
                          aria-label="Delete expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Personal One-Time Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  Personal One-Time Expenses
                  <InfoTooltip content="Single costs for individuals (e.g., Souvenirs, Personal Shopping)." />
                </h2>
                <p className="text-sm text-muted-foreground">One-off expenses for a specific person.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tripState.oneTimePersonalExpenses.length === 0 ? (
                <div className="col-span-full text-center py-8 border-2 border-dashed rounded-xl border-muted-foreground/25">
                  <p className="text-muted-foreground">No personal one-time expenses.</p>
                </div>
              ) : (
                tripState.oneTimePersonalExpenses.map((expense) => (
                  <Card key={expense.id}>
                    <CardContent className="p-6 flex flex-col justify-between h-full gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">{expense.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {expense.currency} {expense.totalCost.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary"
                          onClick={() => handleEditExpense(expense, "oneTimePersonal")}
                          aria-label="Edit expense"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setExpenseToDelete({ id: expense.id, type: "oneTimePersonal", name: expense.name })}
                          aria-label="Delete expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
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

      <Dialog open={isUnifiedCreatorOpen} onOpenChange={setIsUnifiedCreatorOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Follow the steps to add a new expense to your trip.
            </DialogDescription>
          </DialogHeader>
          <UnifiedExpenseCreator
            defaultCurrency={displayCurrency}
            defaultStartDate={defaultStartDate}
            defaultEndDate={defaultEndDate}
            onSave={handleSaveUnifiedExpense}
            onCancel={() => setIsUnifiedCreatorOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForms();
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {expenseToEdit ? "Edit Expense" : `Add ${dialogExpenseType.replace(/([A-Z])/g, ' $1').trim()}`}
            </DialogTitle>
            <DialogDescription>
              {expenseToEdit ? "Update the details for this expense." : "Enter the details for the new expense."}
            </DialogDescription>
          </DialogHeader>

          {dialogExpenseType === "dailyShared" && (
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
                  <CurrencySelect
                    value={newDailySharedExpense.currency}
                    onValueChange={(value) => setNewDailySharedExpense({ ...newDailySharedExpense, currency: value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date Range</Label>
                <DatePickerWithRange
                  aria-label="Date Range"
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
                <Label className="flex items-center gap-2">
                  Split Mode
                </Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      checked={newDailySharedExpense.splitMode === "dailyOccupancy"}
                      onChange={() => setNewDailySharedExpense({ ...newDailySharedExpense, splitMode: "dailyOccupancy" })}
                      className="accent-primary-600"
                    />
                    Daily Occupancy
                    <InfoTooltip content="Cost is divided based on the number of days each traveler was present." />
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      checked={newDailySharedExpense.splitMode === "stayWeighted"}
                      onChange={() => setNewDailySharedExpense({ ...newDailySharedExpense, splitMode: "stayWeighted" })}
                      className="accent-primary-600"
                    />
                    Even-day Split
                    <InfoTooltip content="Cost is divided equally among all selected travelers." />
                  </label>
                </div>
              </div>
              {error && <div className="text-sm text-destructive">{error}</div>}
              <DialogFooter>
                <Button type="submit">{expenseToEdit ? "Update Expense" : "Add Expense"}</Button>
              </DialogFooter>
            </form>
          )}

          {dialogExpenseType === "dailyPersonal" && (
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
                  <CurrencySelect
                    value={newDailyPersonalExpense.currency}
                    onValueChange={(value) => setNewDailyPersonalExpense({ ...newDailyPersonalExpense, currency: value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date Range</Label>
                <DatePickerWithRange
                  aria-label="Date Range"
                  date={{
                    from: newDailyPersonalExpense.startDate ? parseISO(newDailyPersonalExpense.startDate) : undefined,
                    to: newDailyPersonalExpense.endDate ? parseISO(newDailyPersonalExpense.endDate) : undefined,
                  }}
                  onDateChange={(range) => {
                    if (range?.from && range?.to) {
                      setNewDailyPersonalExpense({
                        ...newDailyPersonalExpense,
                        startDate: format(range.from, "yyyy-MM-dd"),
                        endDate: format(range.to, "yyyy-MM-dd"),
                      });
                    }
                  }}
                  className="w-full"
                />
              </div>
              {error && <div className="text-sm text-destructive">{error}</div>}
              <DialogFooter>
                <Button type="submit">{expenseToEdit ? "Update Expense" : "Add Expense"}</Button>
              </DialogFooter>
            </form>
          )}

          {dialogExpenseType === "oneTimeShared" && (
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
                  <CurrencySelect
                    value={newOneTimeSharedExpense.currency}
                    onValueChange={(value) => setNewOneTimeSharedExpense({ ...newOneTimeSharedExpense, currency: value })}
                  />
                </div>
              </div>
              {error && <div className="text-sm text-destructive">{error}</div>}
              <DialogFooter>
                <Button type="submit">{expenseToEdit ? "Update Expense" : "Add Expense"}</Button>
              </DialogFooter>
            </form>
          )}

          {dialogExpenseType === "oneTimePersonal" && (
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
                  <CurrencySelect
                    value={newOneTimePersonalExpense.currency}
                    onValueChange={(value) => setNewOneTimePersonalExpense({ ...newOneTimePersonalExpense, currency: value })}
                  />
                </div>
              </div>
              {error && <div className="text-sm text-destructive">{error}</div>}
              <DialogFooter>
                <Button type="submit">{expenseToEdit ? "Update Expense" : "Add Expense"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={expenseToDelete !== null}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={handleDeleteExpense}
        title="Delete Expense"
        message={`Are you sure you want to delete ${expenseToDelete?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div >
  );
}
