import * as React from "react"
import { Check, ChevronsUpDown, Plus, X } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { Traveler } from "@/types"

interface TravelerSelectorProps {
    travelers: Traveler[]
    selectedTravelerIds: string[]
    onToggleTraveler: (travelerId: string, selected: boolean) => void
    onCreateTraveler: (name: string) => void
}

export function TravelerSelector({
    travelers,
    selectedTravelerIds,
    onToggleTraveler,
    onCreateTraveler,
}: TravelerSelectorProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState("")

    const selectedTravelers = travelers.filter((t) =>
        selectedTravelerIds.includes(t.id)
    )

    const handleSelect = (travelerId: string) => {
        const isSelected = selectedTravelerIds.includes(travelerId)
        onToggleTraveler(travelerId, !isSelected)
        setInputValue("")
    }

    const handleCreate = () => {
        if (inputValue.trim()) {
            onCreateTraveler(inputValue.trim())
            setInputValue("")
        }
    }

    return (
        <div className="flex flex-col gap-3">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between h-auto min-h-10 py-2 px-3"
                    >
                        <div className="flex flex-wrap gap-1 items-center">
                            {selectedTravelers.length > 0 ? (
                                selectedTravelers.map((traveler) => (
                                    <Badge
                                        key={traveler.id}
                                        variant="secondary"
                                        className="mr-1 mb-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleTraveler(traveler.id, false);
                                        }}
                                    >
                                        {traveler.name}
                                        <X className="h-3 w-3 ml-1 hover:text-destructive cursor-pointer" />
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-muted-foreground">Select travelers...</span>
                            )}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                        <CommandInput
                            placeholder="Search traveler..."
                            value={inputValue}
                            onValueChange={setInputValue}
                        />
                        <CommandList>
                            <CommandEmpty>
                                <div className="p-2 flex flex-col items-center gap-2">
                                    <p className="text-sm text-muted-foreground">No traveler found.</p>
                                    {inputValue && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="w-full"
                                            onClick={handleCreate}
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Create "{inputValue}"
                                        </Button>
                                    )}
                                </div>
                            </CommandEmpty>
                            <CommandGroup>
                                {travelers.map((traveler) => (
                                    <CommandItem
                                        key={traveler.id}
                                        value={traveler.name}
                                        onSelect={() => handleSelect(traveler.id)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedTravelerIds.includes(traveler.id)
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                        {traveler.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}
