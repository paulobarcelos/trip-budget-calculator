"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Cloud } from "lucide-react";

const LOCAL_STORAGE_EVENT_NAME = "codex-local-storage";

export function SyncStatus() {
    const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const handleStorageChange = (event: Event) => {
            // When storage changes, show "Saved"
            setStatus("saved");

            // Clear previous timeout
            if (timeoutId) clearTimeout(timeoutId);

            // Reset to idle after 3 seconds
            timeoutId = setTimeout(() => {
                setStatus("idle");
            }, 3000);
        };

        window.addEventListener(LOCAL_STORAGE_EVENT_NAME, handleStorageChange);

        // Also listen to native storage event for cross-tab sync
        window.addEventListener("storage", handleStorageChange);

        return () => {
            window.removeEventListener(LOCAL_STORAGE_EVENT_NAME, handleStorageChange);
            window.removeEventListener("storage", handleStorageChange);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, []);

    if (status === "idle") return null;

    return (
        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 animate-in fade-in duration-300">
            {status === "saved" && (
                <>
                    <Cloud className="h-4 w-4" />
                    <span>Saved to device</span>
                </>
            )}
        </div>
    );
}
