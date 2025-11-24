import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FeatureCard } from "@/components/FeatureCard";
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
          <FeatureCard
            icon={Wallet}
            title="1. Add Expenses"
            description="Log shared and personal costs in any currency. We handle the conversions."
          />

          <FeatureCard
            icon={Users}
            title="2. Add Travelers"
            description="List who is coming. We'll track individual balances and total costs."
          />

          <FeatureCard
            icon={CalendarDays}
            title="3. Track Usage"
            description="Mark who was present for each day or expense to split costs fairly."
          />
        </div>

        <div>
          <Link href="/expenses">
            <Button size="lg" className="text-lg px-8 py-6 h-auto gap-2">
              Let&apos;s get started! <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
