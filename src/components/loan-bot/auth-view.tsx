'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getBorrowerByPhone } from '@/lib/mockApi';
import type { Borrower } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  phoneNumber: z.string().min(9, 'Please enter a valid phone number.').max(15, 'Please enter a valid phone number.'),
});

type AuthViewProps = {
  onAuthenticated: (borrower: Borrower) => void;
};

export function AuthView({ onAuthenticated }: AuthViewProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phoneNumber: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    try {
      const borrower = await getBorrowerByPhone(values.phoneNumber);
      onAuthenticated(borrower);
    } catch (err) {
      setError('This phone number is not registered. Please check the number and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-sm">
        <CardHeader>
            <CardTitle>Welcome to LoanBot</CardTitle>
            <CardDescription>Please enter your registered phone number to continue.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., 912345678" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
                </Button>
            </form>
            </Form>
        </CardContent>
        </Card>
    </div>
  );
}
