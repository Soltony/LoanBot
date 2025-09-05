'use client';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BadgeCheck, Landmark, History, FileText } from 'lucide-react';
import type { View } from '@/app/page';

type MainMenuViewProps = {
  onSelectView: (view: View) => void;
  borrowerName: string;
};

const menuItems = [
  {
    view: 'ELIGIBILITY',
    title: 'Check Loan Eligibility',
    description: 'See which loans you qualify for.',
    icon: BadgeCheck,
  },
  {
    view: 'ACTIVE_LOANS',
    title: 'View My Active Loans',
    description: 'Check the status of your current loans.',
    icon: Landmark,
  },
  {
    view: 'HISTORY',
    title: 'My Loan History',
    description: 'Review your past transactions and loans.',
    icon: History,
  },
];

export function MainMenuView({ onSelectView, borrowerName }: MainMenuViewProps) {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome, {borrowerName}!
        </h1>
        <p className="text-muted-foreground mt-2">What would you like to do today?</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <Card
            key={item.view}
            onClick={() => onSelectView(item.view as View)}
            className="cursor-pointer hover:shadow-lg hover:border-primary transition-all duration-300 group"
          >
            <CardHeader className="flex flex-col items-center text-center p-6">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                 <item.icon className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-lg font-semibold">{item.title}</CardTitle>
              <CardDescription className="mt-2 text-sm">{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
