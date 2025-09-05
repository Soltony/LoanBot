'use client';
import * as React from 'react';
import { getActiveLoans } from '@/lib/mockApi';
import type { Loan } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from './back-button';
import { format } from 'date-fns';

type ActiveLoansViewProps = {
  borrowerId: string;
  onBack: () => void;
};

export function ActiveLoansView({ borrowerId, onBack }: ActiveLoansViewProps) {
  const [loans, setLoans] = React.useState<Loan[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchLoans() {
      setIsLoading(true);
      const activeLoans = await getActiveLoans(borrowerId);
      setLoans(activeLoans);
      setIsLoading(false);
    }
    fetchLoans();
  }, [borrowerId]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 relative">
        <BackButton onClick={onBack} />
        <div className="text-center mb-8 pt-10">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My Active Loans</h1>
            <p className="text-muted-foreground mt-2">Here is a summary of your outstanding loans.</p>
        </div>
        
        {isLoading ? (
             <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        ) : loans.length > 0 ? (
            <div className="space-y-6">
            {loans.map(loan => (
                <Card key={loan.id} className="overflow-hidden">
                <CardHeader>
                    <CardTitle>{loan.productName}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Loan Amount</p>
                            <p className="font-semibold text-lg">${loan.loanAmount.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Amount Repaid</p>
                            <p className="font-semibold text-lg">${loan.amountRepaid.toLocaleString()}</p>
                        </div>
                         <div>
                            <p className="text-muted-foreground">Due Date</p>
                            <p className="font-semibold text-lg">{format(new Date(loan.dueDate), 'MMMM d, yyyy')}</p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-muted-foreground text-sm mb-1">Repayment Progress</p>
                        <div className="w-full bg-muted rounded-full h-2.5">
                             <div className="bg-primary h-2.5 rounded-full" style={{ width: `${(loan.amountRepaid / loan.loanAmount) * 100}%` }}></div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/50 px-6 py-4">
                     <Button>Repay Now</Button>
                     <p className="text-xs text-muted-foreground ml-4">Repayment functionality is coming soon.</p>
                </CardFooter>
                </Card>
            ))}
            </div>
        ) : (
            <Card className="text-center py-12">
                <CardContent>
                    <h3 className="text-xl font-semibold">No Active Loans</h3>
                    <p className="text-muted-foreground mt-2">You do not have any outstanding loans at the moment.</p>
                </CardContent>
            </Card>
        )}

    </div>
  );
}
