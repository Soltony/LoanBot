'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Loan } from '@/lib/types';
import { repayLoan } from '@/lib/mockApi';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type RepayLoanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan;
  onSuccess: (updatedLoan: Loan) => void;
};

export function RepayLoanDialog({ open, onOpenChange, loan, onSuccess }: RepayLoanDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const { toast } = useToast();

  const outstandingBalance = loan.loanAmount - loan.amountRepaid;

  const formSchema = z.object({
    repaymentAmount: z.coerce.number()
      .min(1, 'Repayment amount must be greater than 0.')
      .max(outstandingBalance, `Amount cannot exceed the outstanding balance of $${outstandingBalance.toLocaleString()}.`),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      repaymentAmount: '' as any,
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after a delay to allow for closing animation
    setTimeout(() => {
        form.reset();
        setIsLoading(false);
        setIsSuccess(false);
    }, 300);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
        const updatedLoan = await repayLoan(loan.id, values.repaymentAmount);
        setIsSuccess(true);
        // Delay calling onSuccess to show the success message
        setTimeout(() => {
            onSuccess(updatedLoan);
            handleClose();
        }, 1500)
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Repayment Failed',
        description: 'There was an error submitting your repayment. Please try again.',
      });
      handleClose();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        {isSuccess ? (
            <div className="flex flex-col items-center text-center p-4">
                <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
                <p className="text-muted-foreground mb-4">Your payment of ${form.getValues('repaymentAmount').toLocaleString()} has been processed.</p>
                <Button onClick={handleClose} className="mt-6 w-full">Done</Button>
            </div>
        ) : (
            <>
                <DialogHeader>
                    <DialogTitle>Repay {loan.productName}</DialogTitle>
                    <DialogDescription>
                        Your outstanding balance is ${outstandingBalance.toLocaleString()}.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="repaymentAmount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Repayment Amount</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                                <Input type="number" placeholder="e.g., 100" className="pl-6" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    'Submit Payment'
                                )}
                            </Button>
                        </form>
                    </Form>
                </div>
            </>
        )}
      </DialogContent>
    </Dialog>
  );
}
