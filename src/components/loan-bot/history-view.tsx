'use client';
import * as React from 'react';
import { getTransactions } from '@/lib/mockApi';
import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from './back-button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type HistoryViewProps = {
  borrowerId: string;
  onBack: () => void;
};

export function HistoryView({ borrowerId, onBack }: HistoryViewProps) {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchHistory() {
      setIsLoading(true);
      const history = await getTransactions(borrowerId);
      setTransactions(history);
      setIsLoading(false);
    }
    fetchHistory();
  }, [borrowerId]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 relative">
      <BackButton onClick={onBack} />
      <div className="text-center mb-8 pt-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">My Loan History</h1>
        <p className="text-muted-foreground mt-2">A complete record of all your transactions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>Debits are disbursements to you. Credits are repayments from you.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(txn => (
                  <TableRow key={txn.id}>
                    <TableCell className="font-medium whitespace-nowrap">{format(new Date(txn.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{txn.description}</TableCell>
                    <TableCell className={cn(
                      "text-right font-semibold",
                      txn.type === 'Debit' ? 'text-green-600' : 'text-red-600'
                    )}>
                      {txn.type === 'Debit' ? '+' : ''}${Math.abs(txn.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold">No Transactions Found</h3>
              <p className="text-muted-foreground mt-2">You have not made any transactions yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
