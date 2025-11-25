"use client";

import * as React from "react";
import { format, differenceInDays, parseISO, addDays } from "date-fns";
import { Calendar as CalendarIcon, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { CurrencySelect } from "@/components/CurrencySelect";
import { InfoTooltip } from "@/components/InfoTooltip";
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

export function UnifiedExpenseCreator({
    defaultCurrency,
    defaultStartDate,
    defaultEndDate,
    onSave,
    onCancel,
}: UnifiedExpenseCreatorProps) {
    const [name, setName] = React.useState("");
    const [isDaily, setIsDaily] = React.useState(false);
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
        from: parseISO(defaultStartDate),
        to: parseISO(defaultEndDate),
    });
    const [currency, setCurrency] = React.useState(defaultCurrency);
    const [totalCost, setTotalCost] = React.useState("");
    const [dailyCost, setDailyCost] = React.useState("");
    const [isShared, setIsShared] = React.useState(true);
    const [splitMode, setSplitMode] = React.useState<"dailyOccupancy" | "stayWeighted">("dailyOccupancy");

    // Calculate days
    const days = React.useMemo(() => {
        if (!dateRange?.from || !dateRange?.to) return 0;
        return differenceInDays(dateRange.to, dateRange.from);
    }, [dateRange]);

    // Sync Total and Daily costs
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

    // Recalculate daily cost when days change (Total is authoritative)
    React.useEffect(() => {
        if (days > 0 && totalCost) {
            const numTotal = parseFloat(totalCost);
            if (!isNaN(numTotal)) {
                setDailyCost((numTotal / days).toFixed(2));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [days]);

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

    const isValid = name.trim().length > 0 && !isNaN(parseFloat(totalCost)) && (!isDaily || (!!dateRange?.from && !!dateRange?.to));

    return (
        <div className="space-y-6 py-4">
            {/* Name */}
            <div className="space-y-2">
                <Label htmlFor="name">What is this expense for?</Label>
                <Input
                    id="name"
                    placeholder="e.g., Hotel, Dinner, Taxi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                />
            </div>

            {/* Date Range Toggle */}
            <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                <div className="space-y-0.5">
                    <Label className="text-base">Date Range</Label>
                    <p className="text-sm text-muted-foreground">
                        Is this expense over multiple days?
                    </p>
                </div>
                <Switch
                    checked={isDaily}
                    onCheckedChange={setIsDaily}
                />
            </div>

            {/* Date Range Picker (Conditional) */}
            {isDaily && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <DatePickerWithRange
                        label={days > 0 ? `${days} Days` : "Select Dates"}
                        date={dateRange}
                        onDateChange={setDateRange}
                    />
                </div>
            )}

            {/* Cost & Currency */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <CurrencySelect
                        value={currency}
                        onValueChange={setCurrency}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Cost</Label>
                    {isDaily ? (
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="totalCost"
                                    type="number"
                                    placeholder="0.00"
                                    value={totalCost}
                                    onChange={(e) => handleTotalCostChange(e.target.value)}
                                    className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                    total
                                </span>
                            </div>
                            <div className="text-muted-foreground">
                                <Info className="h-4 w-4 rotate-45" />
                            </div>
                            <div className="relative flex-1">
                                <Input
                                    id="dailyCost"
                                    type="number"
                                    placeholder="0.00"
                                    value={dailyCost}
                                    onChange={(e) => handleDailyCostChange(e.target.value)}
                                    className="pr-16"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                    per day
                                </span>
                            </div>
                        </div>
                    ) : (
                        <Input
                            id="totalCost"
                            type="number"
                            placeholder="0.00"
                            value={totalCost}
                            onChange={(e) => handleTotalCostChange(e.target.value)}
                        />
                    )}
                </div>
            </div>

            {/* Shared Toggle */}
            <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                <div className="space-y-0.5">
                    <Label className="text-base">Shared Expense</Label>
                    <p className="text-sm text-muted-foreground">
                        Is this split among the group?
                    </p>
                </div>
                <Switch
                    checked={isShared}
                    onCheckedChange={setIsShared}
                />
            </div>

            {/* Split Mode (Conditional: Shared & Daily) */}
            {isShared && isDaily && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label>Split Mode</Label>
                    <Select
                        value={splitMode}
                        onValueChange={(v: any) => setSplitMode(v)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="dailyOccupancy">
                                Daily Occupancy (Based on who is there)
                            </SelectItem>
                            <SelectItem value="stayWeighted">
                                Even Split (Split equally by total cost)
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button onClick={handleSave} disabled={!isValid}>
                    Add Expense
                </Button>
            </div>
        </div>
    );
}
