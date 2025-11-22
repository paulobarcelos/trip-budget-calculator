"use client";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { TripState, DailyPersonalExpense } from "@/types";
import { useState, useEffect } from "react";
import { initialTripState } from "@/constants/initialState";
import { migrateState } from "@/utils/stateMigrations";
import { formatCurrency } from "@/utils/currencyFormatting";
import { convertCurrency } from "@/utils/currencyConversion";
import { currencies } from "@/data/currencies";
import { Instructions } from "@/components/Instructions";
import { useDisplayCurrency } from "@/providers/DisplayCurrencyProvider";
import { instructions } from "./instructions";
import { getDayCount } from "@/utils/tripStateUpdates";
import { decodeState } from "@/utils/stateEncoding";
import { calculateDailySharedAllocations } from "@/utils/dailySharedSplit";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

type CurrencyTotal = {
  amount: number;
  isApproximate: boolean;
};

const createCurrencyTotal = (): CurrencyTotal => ({
  amount: 0,
  isApproximate: false,
});

const sumCurrencyTotals = (
  a: CurrencyTotal,
  b: CurrencyTotal,
): CurrencyTotal => ({
  amount: a.amount + b.amount,
  isApproximate: a.isApproximate || b.isApproximate,
});

const aggregateTotals = (...totals: CurrencyTotal[]): CurrencyTotal =>
  totals.reduce(
    (acc, total) => sumCurrencyTotals(acc, total),
    createCurrencyTotal(),
  );

type TravelerCostBreakdown = {
  shared: { daily: CurrencyTotal; oneTime: CurrencyTotal };
  personal: { daily: CurrencyTotal; oneTime: CurrencyTotal };
  total: CurrencyTotal;
};

const createTravelerCostBreakdown = (): TravelerCostBreakdown => ({
  shared: { daily: createCurrencyTotal(), oneTime: createCurrencyTotal() },
  personal: { daily: createCurrencyTotal(), oneTime: createCurrencyTotal() },
  total: createCurrencyTotal(),
});

export default function BudgetPage() {
  const [tripState, , isInitialized] = useLocalStorage<TripState>(
    "tripState",
    initialTripState,
    {
      migrate: migrateState,
      decodeFromUrl: decodeState,
    },
  );
  const { displayCurrency, setDisplayCurrency, isApproximate } =
    useDisplayCurrency();
  const [exchangeRates, setExchangeRates] = useState<Record<
    string,
    number
  > | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRates() {
      try {
        const response = await fetch("/api/exchange-rates");
        const data = await response.json();
        setExchangeRates(data.rates);
      } catch (error) {
        console.error("Failed to fetch exchange rates:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRates();
  }, []);

  if (!isInitialized || isLoading || !exchangeRates) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Budget Summary
        </h1>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const convertAmount = (
    amount: number,
    sourceCurrency: string,
  ): CurrencyTotal => ({
    amount: convertCurrency(
      amount,
      sourceCurrency,
      displayCurrency,
      exchangeRates!,
    ),
    isApproximate: isApproximate(sourceCurrency),
  });

  const calculateTotalCost = (
    expenses: { totalCost: number; currency: string }[],
  ): CurrencyTotal =>
    expenses.reduce<CurrencyTotal>(
      (total, expense) =>
        sumCurrencyTotals(
          total,
          convertAmount(expense.totalCost, expense.currency),
        ),
      createCurrencyTotal(),
    );

  const calculateDailyCost = (
    totalCost: number,
    startDate: string,
    endDate: string,
    currency: string,
  ): CurrencyTotal => {
    const dayCount = getDayCount(startDate, endDate);
    const safeDays = dayCount > 0 ? dayCount : 1;
    const dailyCost = totalCost / safeDays;
    return convertAmount(dailyCost, currency);
  };

  const calculateDailyExpensesTotal = (
    expenses: DailyPersonalExpense[],
  ): CurrencyTotal =>
    expenses.reduce<CurrencyTotal>(
      (total, expense) =>
        sumCurrencyTotals(
          total,
          convertAmount(expense.dailyCost, expense.currency),
        ),
      createCurrencyTotal(),
    );

  const addAmountWithFlag = (
    target: CurrencyTotal,
    amount: number,
    isApproximation: boolean,
  ) => {
    target.amount += amount;
    target.isApproximate = target.isApproximate || isApproximation;
  };

  const oneTimeSharedTotal = calculateTotalCost(
    tripState.oneTimeSharedExpenses,
  );
  const oneTimePersonalTotal = calculateTotalCost(
    tripState.oneTimePersonalExpenses,
  );
  const dailySharedTotal = tripState.dailySharedExpenses.reduce<CurrencyTotal>(
    (total, expense) =>
      sumCurrencyTotals(
        total,
        calculateDailyCost(
          expense.totalCost,
          expense.startDate,
          expense.endDate,
          expense.currency,
        ),
      ),
    createCurrencyTotal(),
  );
  const dailyPersonalTotal = calculateDailyExpensesTotal(
    tripState.dailyPersonalExpenses,
  );

  const totalDailyCost = sumCurrencyTotals(
    dailySharedTotal,
    dailyPersonalTotal,
  );
  const totalOneTimeCost = sumCurrencyTotals(
    oneTimeSharedTotal,
    oneTimePersonalTotal,
  );
  const totalCost = aggregateTotals(totalDailyCost, totalOneTimeCost);

  const travelerCosts = new Map<string, TravelerCostBreakdown>();

  tripState.travelers.forEach((traveler) => {
    travelerCosts.set(traveler.id, createTravelerCostBreakdown());
  });

  tripState.dailySharedExpenses.forEach((expense) => {
    const allocations = calculateDailySharedAllocations(
      expense,
      tripState.usageCosts.days,
      convertAmount,
      calculateDailyCost,
      createCurrencyTotal,
    );

    allocations.forEach((allocation, travelerId) => {
      const costs = travelerCosts.get(travelerId);
      if (!costs) return;
      addAmountWithFlag(
        costs.shared.daily,
        allocation.amount,
        allocation.isApproximate,
      );
      addAmountWithFlag(costs.total, allocation.amount, allocation.isApproximate);
    });
  });

  Object.entries(tripState.usageCosts.days).forEach(([, dailyExpenses]) => {
    Object.entries(dailyExpenses.dailyPersonal).forEach(
      ([expenseId, travelerIds]) => {
        const expense = tripState.dailyPersonalExpenses.find(
          (e) => e.id === expenseId,
        );
        if (!expense || travelerIds.length === 0) return;

        const dailyCost = convertAmount(expense.dailyCost, expense.currency);

        travelerIds.forEach((travelerId) => {
          const costs = travelerCosts.get(travelerId);
          if (!costs) return;

          addAmountWithFlag(
            costs.personal.daily,
            dailyCost.amount,
            dailyCost.isApproximate,
          );
          addAmountWithFlag(
            costs.total,
            dailyCost.amount,
            dailyCost.isApproximate,
          );
        });
      },
    );
  });

  Object.entries(tripState.usageCosts.oneTimeShared).forEach(
    ([expenseId, travelerIds]) => {
      const expense = tripState.oneTimeSharedExpenses.find(
        (e) => e.id === expenseId,
      );
      if (!expense || travelerIds.length === 0) return;

      const convertedCost = convertAmount(expense.totalCost, expense.currency);
      const costPerPerson = convertedCost.amount / travelerIds.length;

      travelerIds.forEach((travelerId) => {
        const costs = travelerCosts.get(travelerId);
        if (!costs) return;

        addAmountWithFlag(
          costs.shared.oneTime,
          costPerPerson,
          convertedCost.isApproximate,
        );
        addAmountWithFlag(
          costs.total,
          costPerPerson,
          convertedCost.isApproximate,
        );
      });
    },
  );

  Object.entries(tripState.usageCosts.oneTimePersonal).forEach(
    ([expenseId, travelerIds]) => {
      const expense = tripState.oneTimePersonalExpenses.find(
        (e) => e.id === expenseId,
      );
      if (!expense) return;

      const totalCost = convertAmount(expense.totalCost, expense.currency);

      travelerIds.forEach((travelerId) => {
        const costs = travelerCosts.get(travelerId);
        if (!costs) return;

        addAmountWithFlag(
          costs.personal.oneTime,
          totalCost.amount,
          totalCost.isApproximate,
        );
        addAmountWithFlag(
          costs.total,
          totalCost.amount,
          totalCost.isApproximate,
        );
      });
    },
  );

  const grandTotal = Array.from(travelerCosts.values()).reduce<CurrencyTotal>(
    (acc, costs) => sumCurrencyTotals(acc, costs.total),
    createCurrencyTotal(),
  );

  function formatAmount(total: CurrencyTotal): string {
    return formatCurrency(total.amount, displayCurrency, total.isApproximate);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Budget Summary
        </h1>
        <p className="text-muted-foreground">
          Review the cost breakdown per traveler and the total trip budget.
        </p>
      </div>

      <Instructions text={instructions} />

      <div className="flex justify-end items-center">
        <div className="flex items-center gap-3">
          <Label htmlFor="currency" className="whitespace-nowrap">
            View in
          </Label>
          <Select
            value={displayCurrency}
            onValueChange={setDisplayCurrency}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {tripState.travelers.map((traveler) => {
            const costs = travelerCosts.get(traveler.id)!;
            return (
              <Card key={traveler.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{traveler.name}</CardTitle>
                  <CardDescription>Cost Breakdown</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium leading-none">Shared Expenses</h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Daily</span>
                      <span>{formatAmount(costs.shared.daily)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">One-time</span>
                      <span>{formatAmount(costs.shared.oneTime)}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium leading-none">Personal Expenses</h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Daily</span>
                      <span>{formatAmount(costs.personal.daily)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">One-time</span>
                      <span>{formatAmount(costs.personal.oneTime)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/50 pt-6">
                  <div className="flex w-full justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <span className="text-lg font-bold">{formatAmount(costs.total)}</span>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl">Grand Total</CardTitle>
            <CardDescription>Total estimated cost for the entire trip</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {formatAmount(grandTotal)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
