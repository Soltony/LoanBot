'use server';

/**
 * @fileOverview A flow that streamlines the loan application process by generating a draft summary.
 *
 * - streamlineLoanApplication - A function that generates a loan application summary.
 * - StreamlineLoanApplicationInput - The input type for the streamlineLoanApplication function.
 * - StreamlineLoanApplicationOutput - The return type for the streamlineLoanApplication function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StreamlineLoanApplicationInputSchema = z.object({
  productDetails: z.string().describe('Details of the loan product, including interest rate, terms, and fees.'),
  loanAmount: z.number().describe('The desired loan amount.'),
  borrowerId: z.string().describe('The ID of the borrower.'),
  productId: z.string().describe('The ID of the product.'),
});
export type StreamlineLoanApplicationInput = z.infer<typeof StreamlineLoanApplicationInputSchema>;

const StreamlineLoanApplicationOutputSchema = z.object({
  summary: z.string().describe('A draft summary of the loan application.'),
});
export type StreamlineLoanApplicationOutput = z.infer<typeof StreamlineLoanApplicationOutputSchema>;

export async function streamlineLoanApplication(input: StreamlineLoanApplicationInput): Promise<StreamlineLoanApplicationOutput> {
  return streamlineLoanApplicationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'streamlineLoanApplicationPrompt',
  input: {schema: StreamlineLoanApplicationInputSchema},
  output: {schema: StreamlineLoanApplicationOutputSchema},
  prompt: `You are a loan application assistant. Generate a concise draft summary of the loan application based on the provided product details and loan amount.

Product Details: {{{productDetails}}}
Loan Amount: {{{loanAmount}}}
Borrower ID: {{{borrowerId}}}
Product ID: {{{productId}}}

Summary:`, 
});

const streamlineLoanApplicationFlow = ai.defineFlow(
  {
    name: 'streamlineLoanApplicationFlow',
    inputSchema: StreamlineLoanApplicationInputSchema,
    outputSchema: StreamlineLoanApplicationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
