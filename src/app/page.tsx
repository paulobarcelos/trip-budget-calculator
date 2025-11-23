import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Wallet, Users, CalendarDays } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8 text-center">
      <div className="max-w-3xl space-y-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl md:text-6xl">
          Trip Budget Calculator
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Plan your trip expenses, track usage, and calculate individual costs effortlessly.
          Stop worrying about the math and enjoy your travels.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12">
          <div className="flex flex-col items-center space-y-4 p-6 bg-card rounded-xl border shadow-sm">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <Wallet className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold">1. Add Expenses</h3>
            <p className="text-sm text-muted-foreground">
              Log shared and personal costs in any currency. We handle the conversions.
            </p>
          </div>

          <div className="flex flex-col items-center space-y-4 p-6 bg-card rounded-xl border shadow-sm">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold">2. Add Travelers</h3>
            <p className="text-sm text-muted-foreground">
              List who is coming. We'll track individual balances and total costs.
            </p>
          </div>

          <div className="flex flex-col items-center space-y-4 p-6 bg-card rounded-xl border shadow-sm">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <CalendarDays className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold">3. Track Usage</h3>
            <p className="text-sm text-muted-foreground">
              Mark who was present for each day or expense to split costs fairly.
            </p>
          </div>
        </div>

        <div>
          <Link href="/expenses">
            <Button size="lg" className="text-lg px-8 py-6 h-auto gap-2">
              Get Started <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
