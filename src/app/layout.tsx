import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { DisplayCurrencyProvider } from "@/providers/DisplayCurrencyProvider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trip Budget Calculator",
  description: "Calculate and split trip expenses between travelers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
        <DisplayCurrencyProvider>
          <div className="min-h-full">
            <Header />
            <main className="py-10 px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-7xl">
                {children}
              </div>
            </main>
          </div>
          <Toaster />
        </DisplayCurrencyProvider>
      </body>
    </html>
  );
}
