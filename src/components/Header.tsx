'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MobileNav } from './MobileNav';
import { DataTransferControls } from './DataTransferControls';
import { SyncStatus } from './SyncStatus';
import { Menu, Sparkles } from 'lucide-react';
import { CurrencySelect } from './CurrencySelect';
import { Button } from './ui/button';
import { currencies } from '@/data/currencies';
import { useDisplayCurrency } from '@/providers/DisplayCurrencyProvider';
import { AiAssistantDialog } from './AiAssistantDialog';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const pathname = usePathname();
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();

  const navigation = [
    { name: 'Expenses', href: '/expenses' },
    { name: 'Travelers', href: '/travelers' },
    { name: 'Usage', href: '/usage' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold tracking-tight text-primary-600 dark:text-primary-400">
              Trip Budget
            </Link>

            {/* Desktop navigation */}
            <div className="hidden md:flex md:items-center md:gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <div className="hidden md:block w-[140px]">
                <CurrencySelect
                  value={displayCurrency}
                  onValueChange={setDisplayCurrency}
                />
              </div>
            </div>
            <div className="hidden md:block">
              <SyncStatus />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAiOpen(true)}
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <Sparkles className="h-5 w-5" />
                <span className="sr-only">Open AI Assistant</span>
              </Button>
              <DataTransferControls />

              {/* Mobile menu button */}
              <div className="flex md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(true)}
                  className="-mr-2"
                >
                  <span className="sr-only">Open menu</span>
                  <Menu className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile navigation drawer */}
      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <AiAssistantDialog open={isAiOpen} onOpenChange={setIsAiOpen} />
    </header>
  );
}
