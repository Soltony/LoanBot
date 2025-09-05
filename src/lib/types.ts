export interface Borrower {
  id: string;
  name: string;
  phoneNumber: string;
  monthlyIncome?: number;
  employmentStatus?: string;
}

export interface Provider {
  id: string;
  name: string;
  icon?: string;
  colorHex?: string;
  products?: ProductDetails[];
}

export interface ProductDetails {
  id: string;
  providerId: string;
  name: string;
  description?: string;
  minLoan?: number;
  maxLoan?: number;
  serviceFee?: { type: string; value: number };
  dailyFee?: { type: string; value: number; calculationBase: string };
}

// This is a consolidated/simplified type for UI components
export interface EligibilityProduct {
  id: string;
  name: string;
  limit: number;
  interestRate: number; // This can be derived from dailyFee for display
  serviceFee: number; // This can be derived from serviceFee.value for calculation
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
  totalRepayableAmount: number; // To hold calculated total including fees
  amountRepaid: number;
  dueDate: string;
  disbursedDate: string;
  repaymentStatus: 'Paid' | 'Unpaid';
  providerId?: string;
  penaltyAmount?: number;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'Debit' | 'Credit';
}
