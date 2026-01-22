"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { migrateState } from "@/utils/stateMigrations";
import { decodeState } from "@/utils/stateEncoding";
import { initialTripState } from "@/constants/initialState";
import { TripState } from "@/types";
import { applyAiActions, describeAction, parseAiResponse, AiResponse } from "@/utils/aiActions";
import { toast } from "sonner";

interface AiAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiAssistantDialog({ open, onOpenChange }: AiAssistantDialogProps) {
  const [tripState, setTripState, isInitialized] = useLocalStorage<TripState>(
    "tripState",
    initialTripState,
    {
      migrate: migrateState,
      decodeFromUrl: decodeState,
    },
  );

  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<AiResponse | null>(null);
  const [responseErrors, setResponseErrors] = useState<string[]>([]);
  const [applyErrors, setApplyErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPrompt("");
      setResponse(null);
      setResponseErrors([]);
      setApplyErrors([]);
      setIsLoading(false);
    }
  }, [open]);

  const actionSummaries = useMemo(() => {
    if (!response) return [];
    return response.actions.map((action) => describeAction(action, tripState));
  }, [response, tripState]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please describe what you want to do.");
      return;
    }
    setIsLoading(true);
    setResponse(null);
    setResponseErrors([]);
    setApplyErrors([]);

    try {
      const res = await fetch("/api/ai/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          tripState,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMessage =
          typeof payload.error === "string" ? payload.error : "Failed to interpret request.";
        setResponseErrors([errorMessage]);
        return;
      }

      const { response: parsed, errors } = parseAiResponse(payload);
      if (!parsed) {
        setResponseErrors(errors.length ? errors : ["No valid actions returned."]);
        return;
      }

      const combinedWarnings = [
        ...(Array.isArray(payload.parseWarnings) ? payload.parseWarnings : []),
        ...errors,
      ];
      setResponse({ ...parsed, warnings: combinedWarnings.length ? combinedWarnings : parsed.warnings });
    } catch (error) {
      console.error("AI request failed:", error);
      setResponseErrors(["AI request failed. Please try again."]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!response) return;
    const { nextState, applied, errors } = applyAiActions(tripState, response.actions);
    setApplyErrors(errors);
    if (applied.length === 0) {
      toast.error("No actions were applied.");
      return;
    }
    setTripState(nextState);
    toast.success(`Applied ${applied.length} action${applied.length === 1 ? "" : "s"}.`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>AI Assistant</DialogTitle>
          <DialogDescription>
            Describe expenses, travelers, and usage in plain language. We will suggest actions for you to confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="ai-prompt">
            What should I do?
          </label>
          <textarea
            id="ai-prompt"
            className="min-h-[110px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
            placeholder="Example: Add an Airbnb in Rio from 2026-02-01 to 2026-02-05 for BRL 1200, split by person-day. Mark Alice and Bob present on Feb 2 and 3."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            disabled={!isInitialized || isLoading}
          />

          {responseErrors.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
              {responseErrors.join(" ")}
            </div>
          )}

          {response && (
            <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-200">
              {response.explanation && (
                <p className="text-sm text-gray-700 dark:text-gray-200">{response.explanation}</p>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Proposed actions
                </p>
                <ScrollArea className="mt-2 max-h-[180px] pr-2">
                  <ul className="space-y-1 text-sm">
                    {actionSummaries.map((summary, index) => (
                      <li key={`${summary}-${index}`} className="flex gap-2">
                        <span className="text-gray-400">{index + 1}.</span>
                        <span>{summary}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>

              {response.warnings && response.warnings.length > 0 && (
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  {response.warnings.join(" ")}
                </div>
              )}

              {applyErrors.length > 0 && (
                <div className="text-xs text-red-600 dark:text-red-300">
                  {applyErrors.join(" ")}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleGenerate} disabled={!isInitialized || isLoading}>
            {isLoading ? "Thinking..." : "Generate actions"}
          </Button>
          <Button
            onClick={handleApply}
            disabled={!response || isLoading}
            variant="default"
          >
            Apply actions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
