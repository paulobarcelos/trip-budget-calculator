"use client";

import { useRef, useState } from "react";
import { initialTripState } from "@/constants/initialState";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { migrateState } from "@/utils/stateMigrations";
import { TripState } from "@/types";
import { decodeState, encodeState } from "@/utils/stateEncoding";

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const showMessage = (message: string, isError = false) => {
    setError(isError ? message : null);
    setSuccess(isError ? null : message);
  };

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
      showMessage(`Exported to ${fileName}`);
    } catch (err) {
      console.error("Failed to export JSON", err);
      showMessage("Could not export data. Please try again.", true);
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
      showMessage("Import successful. Your data has been restored.");
    } catch (err) {
      console.error("Failed to import JSON", err);
      showMessage(
        "Invalid file. Please select a valid trip-budget JSON export.",
        true,
      );
    } finally {
      event.target.value = "";
    }
  };

  const handleCopyLink = async () => {
    try {
      const payload = encodeState(tripState);
      const url = `${window.location.origin}/?data=${payload}`;
      await navigator.clipboard.writeText(url);
      showMessage("Shareable link copied to clipboard.");
    } catch (err) {
      console.error("Failed to copy link", err);
      showMessage("Could not copy link. Please try again.", true);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        onClick={handleExport}
      >
        Export JSON
      </button>
      <button
        type="button"
        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
        onClick={handleImportClick}
      >
        Import JSON
      </button>
      <button
        type="button"
        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
        onClick={handleCopyLink}
      >
        Copy Shareable Link
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImport}
      />
      {(error || success) && (
        <p
          className={`text-sm ${error ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
        >
          {error ?? success}
        </p>
      )}
    </div>
  );
}
