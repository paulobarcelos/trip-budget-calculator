import { useState, useEffect, useMemo } from "react";
import { TripState, DailyPersonalExpense } from "@/types";
import { useDisplayCurrency } from "@/providers/DisplayCurrencyProvider";
import { convertCurrency } from "@/utils/currencyConversion";
import { getDayCount } from "@/utils/tripStateUpdates";
import { calculateDailySharedAllocations } from "@/utils/dailySharedSplit";

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

export type TravelerCostBreakdown = {
    shared: { daily: CurrencyTotal; oneTime: CurrencyTotal };
    personal: { daily: CurrencyTotal; oneTime: CurrencyTotal };
    total: CurrencyTotal;
};

const createTravelerCostBreakdown = (): TravelerCostBreakdown => ({
    shared: { daily: createCurrencyTotal(), oneTime: createCurrencyTotal() },
    personal: { daily: createCurrencyTotal(), oneTime: createCurrencyTotal() },
    total: createCurrencyTotal(),
});

export function useTripBudget(tripState: TripState) {
    const { displayCurrency, isApproximate } = useDisplayCurrency();
    const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);
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

    const budgetData = useMemo(() => {
        if (!exchangeRates) return null;

        const convertAmount = (
            amount: number,
            sourceCurrency: string,
        ): CurrencyTotal => ({
            amount: convertCurrency(
                amount,
                sourceCurrency,
                displayCurrency,
                exchangeRates,
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

        return {
            travelerCosts,
            grandTotal,
            totalDailyCost,
            totalOneTimeCost,
        };
    }, [tripState, exchangeRates, displayCurrency, isApproximate]);

    return {
        budgetData,
        isLoading,
        displayCurrency,
    };
}
