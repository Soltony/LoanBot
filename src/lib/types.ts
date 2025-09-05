export interface Borrower {
  id: string;
  name: string;
  phoneNumber: string;
}

export interface Provider {
  id: string;
  name: string;
}

export interface EligibilityProduct {
  id: string;
  name: string;
  limit: number;
  interestRate: number;
  serviceFee: number; // as a percentage
}

export interface Eligibility {
  creditScore: number;
  products: EligibilityProduct[];
  reason?: string;
}

export interface Loan {
  id: string;
  productName: string;
  productId: string;
  loanAmount: number;
  amountRepaid: number;
  dueDate: string;
  repaymentStatus: 'Paid' | 'Unpaid';
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'Debit' | 'Credit';
}
