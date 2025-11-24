"use client";

import { useRef } from "react";
import { initialTripState } from "@/constants/initialState";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { migrateState } from "@/utils/stateMigrations";
import { TripState } from "@/types";
import { decodeState, encodeState } from "@/utils/stateEncoding";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, Upload, Link as LinkIcon, Settings } from "lucide-react";
import { toast } from "sonner";

export function DataTransferControls() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tripState, setTripState] = useLocalStorage<TripState>(
    "tripState",
    initialTripState,
    {
      migrate: migrateState,
      decodeFromUrl: decodeState,
    },
  );

  const handleExport = () => {
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const fileName = `trip-budget-${y}${m}${d}.json`;

      const blob = new Blob([JSON.stringify(tripState, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported to ${fileName}`);
    } catch (err) {
      console.error("Failed to export JSON", err);
      toast.error("Could not export data. Please try again.");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const migrated = migrateState(parsed);
      setTripState(migrated);
      toast.success("Import successful. Your data has been restored.");
    } catch (err) {
      console.error("Failed to import JSON", err);
      toast.error("Invalid file. Please select a valid trip-budget JSON export.");
    } finally {
      event.target.value = "";
    }
  };

  const handleCopyLink = async () => {
    try {
      const payload = encodeState(tripState);
      const url = `${window.location.origin}/?data=${payload}`;
      await navigator.clipboard.writeText(url);
      toast.success("Shareable link copied to clipboard.");
    } catch (err) {
      console.error("Failed to copy link", err);
      toast.error("Could not copy link. Please try again.");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Data Settings</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            <span>Save to file</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleImportClick}>
            <Upload className="mr-2 h-4 w-4" />
            <span>Open file</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyLink}>
            <LinkIcon className="mr-2 h-4 w-4" />
            <span>Share Link</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImport}
      />
    </>
  );
}
