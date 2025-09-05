'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Borrower, EligibilityProduct } from '@/lib/types';
import { applyForLoan } from '@/lib/mockApi';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ApplyLoanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: EligibilityProduct;
  borrower: Borrower;
};

export function ApplyLoanDialog({ open, onOpenChange, product, borrower }: ApplyLoanDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const { toast } = useToast();

  const formSchema = z.object({
    loanAmount: z.coerce.number()
      .min(1, 'Loan amount must be greater than 0.')
      .max(product.limit, `Amount cannot exceed your limit of $${product.limit.toLocaleString()}.`),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loanAmount: undefined,
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
        await applyForLoan({
            borrowerId: borrower.id,
            productId: product.id,
            loanAmount: values.loanAmount,
        });
        setIsSuccess(true);
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Application Failed',
        description: 'There was an error submitting your loan application. Please try again.',
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
                <h2 className="text-2xl font-bold mb-2">Loan Approved!</h2>
                <p className="text-muted-foreground mb-4">Your loan for ${form.getValues('loanAmount').toLocaleString()} has been disbursed.</p>
                <Button onClick={handleClose} className="mt-6 w-full">Done</Button>
            </div>
        ) : (
            <>
                <DialogHeader>
                    <DialogTitle>Apply for {product.name}</DialogTitle>
                    <DialogDescription>
                        Your maximum loan amount for this product is ${product.limit.toLocaleString()}.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="loanAmount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Desired Loan Amount</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                                <Input type="number" placeholder="e.g., 500" className="pl-6" {...field} />
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
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Application'
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