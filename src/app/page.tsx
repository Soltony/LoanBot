'use client';
import * as React from 'react';
import type { Borrower } from '@/lib/types';
import { AuthView } from '@/components/loan-bot/auth-view';
import { MainMenuView } from '@/components/loan-bot/main-menu-view';
import { EligibilityView } from '@/components/loan-bot/eligibility-view';
import { ActiveLoansView } from '@/components/loan-bot/active-loans-view';
import { HistoryView } from '@/components/loan-bot/history-view';
import { Logo } from '@/components/logo';

export type View = 'AUTH' | 'MENU' | 'ELIGIBILITY' | 'ACTIVE_LOANS' | 'HISTORY';

export default function Home() {
  const [view, setView] = React.useState<View>('AUTH');
  const [borrower, setBorrower] = React.useState<Borrower | null>(null);
  
  const handleAuthenticated = (authedBorrower: Borrower) => {
    setBorrower(authedBorrower);
    setView('MENU');
  };

  const handleBackToMenu = () => {
    setView('MENU');
  }

  const renderView = () => {
    if (!borrower) {
      return <AuthView onAuthenticated={handleAuthenticated} />;
    }

    switch (view) {
      case 'MENU':
        return <MainMenuView onSelectView={setView} borrowerName={borrower.name}/>;
      case 'ELIGIBILITY':
        return <EligibilityView borrower={borrower} onBack={handleBackToMenu} />;
      case 'ACTIVE_LOANS':
        return <ActiveLoansView borrowerId={borrower.id} onBack={handleBackToMenu} />;
      case 'HISTORY':
        return <HistoryView borrowerId={borrower.id} onBack={handleBackToMenu} />;
      default:
        return <AuthView onAuthenticated={handleAuthenticated} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="p-4 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          <Logo className="w-8 h-8 text-primary" />
          <h1 className="text-xl font-bold text-foreground">LoanBot</h1>
        </div>
      </header>
      <main className="flex-1">
        <div className="relative">
            {renderView()}
        </div>
      </main>
      <footer className="p-4 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} LoanBot. All rights reserved.
      </footer>
    </div>
  );
}
