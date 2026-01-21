"use client";

import * as React from "react";
import { format, differenceInDays, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Calendar, Users, User, DollarSign, Clock, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { CurrencySelect } from "@/components/CurrencySelect";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export type ExpenseCreationData = {
    name: string;
    isDaily: boolean;
    startDate?: string;
    endDate?: string;
    currency: string;
    totalCost: number;
    isShared: boolean;
    splitMode?: "dailyOccupancy" | "stayWeighted";
};

interface UnifiedExpenseCreatorProps {
    defaultCurrency: string;
    defaultStartDate: string;
    defaultEndDate: string;
    onSave: (data: ExpenseCreationData) => void;
    onCancel: () => void;
}

const steps = [
    { id: "name", title: "What expense do you want to budget?" },
    { id: "duration", title: "What kind of expense is this?" },
    { id: "cost", title: "Estimated Cost" },
    { id: "sharing", title: "Is this expense shared or individual?" },
];

export function UnifiedExpenseCreator({
    defaultCurrency,
    defaultStartDate,
    defaultEndDate,
    onSave,
    onCancel,
}: UnifiedExpenseCreatorProps) {
    const [currentStep, setCurrentStep] = React.useState(0);
    const [direction, setDirection] = React.useState(0);

    // Form State
    const [name, setName] = React.useState("");
    const [isDaily, setIsDaily] = React.useState(true); // Default to Time-Bound as it's more complex? Or maybe no default until selected. Let's keep existing logic.
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
        from: parseISO(defaultStartDate),
        to: parseISO(defaultEndDate),
    });
    const [currency, setCurrency] = React.useState(defaultCurrency);
    const [totalCost, setTotalCost] = React.useState("");
    const [dailyCost, setDailyCost] = React.useState("");
    const [isShared, setIsShared] = React.useState(true);
    const [splitMode, setSplitMode] = React.useState<"dailyOccupancy" | "stayWeighted">("dailyOccupancy");

    // Derived State
    const days = React.useMemo(() => {
        if (!dateRange?.from || !dateRange?.to) return 0;
        return differenceInDays(dateRange.to, dateRange.from);
    }, [dateRange]);

    // Handlers
    const handleTotalCostChange = (value: string) => {
        setTotalCost(value);
        const num = parseFloat(value);
        if (!isNaN(num) && days > 0) {
            setDailyCost((num / days).toFixed(2));
        } else {
            setDailyCost("");
        }
    };

    const handleDailyCostChange = (value: string) => {
        setDailyCost(value);
        const num = parseFloat(value);
        if (!isNaN(num) && days > 0) {
            setTotalCost((num * days).toFixed(2));
        } else {
            setTotalCost("");
        }
    };

    // Effects
    React.useEffect(() => {
        if (days > 0 && totalCost) {
            const numTotal = parseFloat(totalCost);
            if (!isNaN(numTotal)) {
                setDailyCost((numTotal / days).toFixed(2));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [days]);

    // Navigation
    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setDirection(1);
            setCurrentStep((prev) => prev + 1);
        } else {
            handleSave();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setDirection(-1);
            setCurrentStep((prev) => prev - 1);
        } else {
            onCancel();
        }
    };

    const handleSave = () => {
        if (!name) return;
        const cost = parseFloat(totalCost);
        if (isNaN(cost)) return;

        onSave({
            name,
            isDaily,
            startDate: isDaily && dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
            endDate: isDaily && dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
            currency,
            totalCost: cost,
            isShared,
            splitMode: isShared && isDaily ? splitMode : undefined,
        });
    };

    // Validation
    const isStepValid = () => {
        switch (currentStep) {
            case 0: // Name
                return name.trim().length > 0;
            case 1: // Duration
                return !isDaily || (!!dateRange?.from && !!dateRange?.to);
            case 2: // Cost
                return !isNaN(parseFloat(totalCost)) && parseFloat(totalCost) > 0;
            case 3: // Sharing
                return true;
            default:
                return false;
        }
    };

    // Key Press
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && isStepValid()) {
            e.preventDefault();
            nextStep();
        }
    };

    // Animation Variants
    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0,
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 50 : -50,
            opacity: 0,
        }),
    };

    return (
        <div className="flex flex-col h-[400px]" onKeyDown={handleKeyDown}>
            {/* Progress */}
            <div className="flex gap-1 mb-8">
                {steps.map((step, index) => (
                    <div
                        key={step.id}
                        className={cn(
                            "h-1 flex-1 rounded-full transition-colors duration-300",
                            index <= currentStep ? "bg-primary" : "bg-muted"
                        )}
                    />
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 relative overflow-hidden">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={currentStep}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 },
                        }}
                        className="absolute inset-0 flex flex-col"
                    >
                        <h2 className="text-2xl font-bold mb-6">{steps[currentStep].title}</h2>

                        <div className="flex-1 overflow-y-auto px-1">
                            {currentStep === 0 && (
                                <div className="space-y-4">
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g., Airbnb, Car Rental, Group Dinner"
                                        className="text-xl p-6 h-auto"
                                        autoFocus
                                    />
                                    <p className="text-muted-foreground text-sm">
                                        Press <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">Enter ↵</kbd> to continue
                                    </p>
                                </div>
                            )}

                            {currentStep === 1 && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setIsDaily(true)}
                                            className={cn(
                                                "flex flex-col items-start p-6 rounded-xl border-2 transition-all hover:bg-muted/50 text-left space-y-2",
                                                isDaily ? "border-primary bg-primary/5" : "border-muted"
                                            )}
                                        >
                                            <div className="p-2 rounded-full bg-background border">
                                                <Clock className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <span className="font-semibold block text-lg">Time-Bound</span>
                                                <span className="text-sm text-muted-foreground">Expenses that span across days</span>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => setIsDaily(false)}
                                            className={cn(
                                                "flex flex-col items-start p-6 rounded-xl border-2 transition-all hover:bg-muted/50 text-left space-y-2",
                                                !isDaily ? "border-primary bg-primary/5" : "border-muted"
                                            )}
                                        >
                                            <div className="p-2 rounded-full bg-background border">
                                                <Ticket className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <span className="font-semibold block text-lg">One-off</span>
                                                <span className="text-sm text-muted-foreground">Expenses that occur once</span>
                                            </div>
                                        </button>
                                    </div>

                                    {isDaily && (
                                        <div className="animate-in fade-in slide-in-from-top-2">
                                            <DatePickerWithRange
                                                label={days > 0 ? `${days} Days` : "Select Dates"}
                                                date={dateRange}
                                                onDateChange={setDateRange}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="w-1/3">
                                            <Label className="mb-2 block">Currency</Label>
                                            <CurrencySelect
                                                value={currency}
                                                onValueChange={setCurrency}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <Label className="mb-2 block">Amount</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={totalCost}
                                                    onChange={(e) => handleTotalCostChange(e.target.value)}
                                                    placeholder="0.00"
                                                    className="text-xl p-6 h-auto pl-10"
                                                    autoFocus
                                                />
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </div>

                                    {isDaily && (
                                        <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between text-sm animate-in fade-in">
                                            <span className="text-muted-foreground">Per day cost:</span>
                                            <span className="font-medium">
                                                {currency} {dailyCost || "0.00"} / day
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setIsShared(false)}
                                            className={cn(
                                                "flex flex-col items-start p-6 rounded-xl border-2 transition-all hover:bg-muted/50 text-left space-y-2",
                                                !isShared ? "border-primary bg-primary/5" : "border-muted"
                                            )}
                                        >
                                            <div className="p-2 rounded-full bg-background border">
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <span className="font-semibold block text-lg">Individual</span>
                                                <span className="text-sm text-muted-foreground">Specific to a traveler</span>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => setIsShared(true)}
                                            className={cn(
                                                "flex flex-col items-start p-6 rounded-xl border-2 transition-all hover:bg-muted/50 text-left space-y-2",
                                                isShared ? "border-primary bg-primary/5" : "border-muted"
                                            )}
                                        >
                                            <div className="p-2 rounded-full bg-background border">
                                                <Users className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <span className="font-semibold block text-lg">Shared</span>
                                                <span className="text-sm text-muted-foreground">Split within the group</span>
                                            </div>
                                        </button>
                                    </div>

                                    {isShared && isDaily && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                            <Label>Split Mode</Label>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSplitMode("dailyOccupancy")}
                                                    className={cn(
                                                        "flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all hover:bg-muted/50 space-y-1",
                                                        splitMode === "dailyOccupancy" ? "border-primary bg-primary/5" : "border-muted"
                                                    )}
                                                >
                                                    <span className="font-semibold">Daily Cost Split</span>
                                                    <span className="text-sm text-muted-foreground">
                                                        Fixed daily cost, split among who&apos;s present that day. Fewer people = higher share.
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSplitMode("stayWeighted")}
                                                    className={cn(
                                                        "flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all hover:bg-muted/50 space-y-1",
                                                        splitMode === "stayWeighted" ? "border-primary bg-primary/5" : "border-muted"
                                                    )}
                                                >
                                                    <span className="font-semibold">Person-Day Rate</span>
                                                    <span className="text-sm text-muted-foreground">
                                                        Total cost / person-days. Same per-person-day rate; occupancy doesn&apos;t spike shares.
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex justify-between pt-6 border-t mt-auto">
                <Button variant="ghost" onClick={prevStep}>
                    {currentStep === 0 ? "Cancel" : "Back"}
                </Button>
                <Button onClick={nextStep} disabled={!isStepValid()}>
                    {currentStep === steps.length - 1 ? (
                        <>
                            <Check className="w-4 h-4 mr-2" />
                            Save Expense
                        </>
                    ) : (
                        <>
                            Next
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
