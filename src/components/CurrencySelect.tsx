import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { currencies } from "@/data/currencies"
import { getCurrencyFlag } from "@/utils/flags"

interface CurrencySelectProps {
    value: string
    onValueChange: (value: string) => void
}

export function CurrencySelect({ value, onValueChange }: CurrencySelectProps) {
    const [open, setOpen] = React.useState(false)

    const selectedCurrency = currencies.find((c) => c.code === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {selectedCurrency ? (
                        <span className="flex items-center gap-2 truncate">
                            <span className="text-lg">{getCurrencyFlag(selectedCurrency.code)}</span>
                            <span>{selectedCurrency.code}</span>
                            <span className="text-muted-foreground truncate">- {selectedCurrency.name}</span>
                        </span>
                    ) : (
                        "Select currency..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search currency..." />
                    <CommandList>
                        <CommandEmpty>No currency found.</CommandEmpty>
                        <CommandGroup>
                            {currencies.map((currency) => (
                                <CommandItem
                                    key={currency.code}
                                    value={`${currency.code} ${currency.name}`}
                                    onSelect={() => {
                                        onValueChange(currency.code)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === currency.code ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <span className="mr-2 text-lg">{getCurrencyFlag(currency.code)}</span>
                                    <span className="font-medium mr-2">{currency.code}</span>
                                    <span className="text-muted-foreground truncate">{currency.name}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
