import { describe, expect, it } from "vitest";
import { initialTripState } from "@/constants/initialState";
import { applyAiActions, parseAiResponse } from "@/utils/aiActions";

describe("parseAiResponse", () => {
  it("accepts valid actions", () => {
    const { response, errors } = parseAiResponse({
      actions: [{ type: "addTraveler", name: "Alice" }],
      explanation: "Add Alice.",
    });

    expect(errors).toEqual([]);
    expect(response?.actions).toHaveLength(1);
    expect(response?.actions[0].type).toBe("addTraveler");
  });

  it("rejects empty actions", () => {
    const { response, errors } = parseAiResponse({ actions: [] });
    expect(response).toBeNull();
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("applyAiActions", () => {
  it("adds expenses and usage entries", () => {
    const baseState = structuredClone(initialTripState);
    const { nextState, errors } = applyAiActions(baseState, [
      { type: "addTraveler", name: "Alice" },
      {
        type: "addExpense",
        expenseType: "dailyShared",
        name: "Hotel",
        currency: "USD",
        totalCost: 500,
        startDate: "2026-02-01",
        endDate: "2026-02-05",
        splitMode: "stayWeighted",
      },
      {
        type: "setUsageDaily",
        expenseType: "dailyShared",
        date: "2026-02-02",
        expenseName: "Hotel",
        travelerNames: ["Alice"],
      },
    ]);

    expect(errors).toEqual([]);
    expect(nextState.travelers).toHaveLength(1);
    expect(nextState.dailySharedExpenses).toHaveLength(1);

    const expenseId = nextState.dailySharedExpenses[0].id;
    const usage = nextState.usageCosts.days["2026-02-02"];
    expect(usage.dailyShared[expenseId]).toEqual([nextState.travelers[0].id]);
  });

  it("removes travelers from usage", () => {
    const baseState = structuredClone(initialTripState);
    const { nextState: withUsage } = applyAiActions(baseState, [
      { type: "addTraveler", name: "Alice" },
      {
        type: "addExpense",
        expenseType: "oneTimeShared",
        name: "Tickets",
        currency: "USD",
        totalCost: 50,
      },
      {
        type: "setUsageOneTime",
        expenseType: "oneTimeShared",
        expenseName: "Tickets",
        travelerNames: ["Alice"],
      },
    ]);

    const { nextState } = applyAiActions(withUsage, [
      { type: "removeTraveler", travelerName: "Alice" },
    ]);

    expect(nextState.travelers).toHaveLength(0);
    expect(Object.keys(nextState.usageCosts.oneTimeShared)).toHaveLength(0);
  });
});
