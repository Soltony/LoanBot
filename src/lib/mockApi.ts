import type { Borrower, Provider, Loan, Transaction, Eligibility, EligibilityProduct } from './types';

const borrowers: Borrower[] = [
  { id: 'borrower-1', name: 'Alex Doe', phoneNumber: '1112223333' },
  { id: 'borrower-2', name: 'Sam Smith', phoneNumber: '4445556666' },
  { id: 'borrower-3', name: 'Joanne Rivers', phoneNumber: '7778889999' },
];

const providers: Provider[] = [
  { id: 'provider-1', name: 'Capital Flow' },
  { id: 'provider-2', name: 'Quick-Lend Inc.' },
  { id: 'provider-3', name: 'Evergreen Finance' },
];

const allProducts: EligibilityProduct[] = [
    { id: 'prod-101', name: 'Starter Loan', limit: 500, interestRate: 5, serviceFee: 2.5 },
    { id: 'prod-102', name: 'Business Boost', limit: 5000, interestRate: 8, serviceFee: 3 },
    { id: 'prod-201', name: 'Personal Flex', limit: 1500, interestRate: 6.5, serviceFee: 1.5 },
    { id: 'prod-301', name: 'Home Improver', limit: 10000, interestRate: 4, serviceFee: 2 },
    { id: 'prod-302', name: 'Emergency Cash', limit: 750, interestRate: 10, serviceFee: 5 },
]

const loans: Loan[] = [
  { id: 'loan-1', productName: 'Starter Loan', productId: 'prod-101', loanAmount: 400, amountRepaid: 100, dueDate: '2024-08-15T00:00:00.000Z', repaymentStatus: 'Unpaid' },
  { id: 'loan-2', productName: 'Personal Flex', productId: 'prod-201', loanAmount: 1200, amountRepaid: 1200, dueDate: '2024-05-20T00:00:00.000Z', repaymentStatus: 'Paid' },
];

const transactions: Transaction[] = [
  { id: 'txn-1', date: '2024-07-15T10:00:00.000Z', description: 'Loan Disbursement - Starter Loan', amount: 400, type: 'Debit' },
  { id: 'txn-2', date: '2024-07-25T14:30:00.000Z', description: 'Repayment', amount: -50, type: 'Credit' },
  { id: 'txn-3', date: '2024-08-01T09:00:00.000Z', description: 'Repayment', amount: -50, type: 'Credit' },
  { id: 'txn-4', date: '2024-04-20T11:00:00.000Z', description: 'Loan Disbursement - Personal Flex', amount: 1200, type: 'Debit' },
  { id: 'txn-5', date: '2024-05-18T16:00:00.000Z', description: 'Full Repayment', amount: -1200, type: 'Credit' },
];

const eligibilities: Record<string, Record<string, Eligibility>> = {
    'borrower-1': {
        'provider-1': {
            creditScore: 720,
            products: [allProducts[0], {...allProducts[1], limit: 2500}],
        },
        'provider-2': {
            creditScore: 720,
            products: [allProducts[2]],
        },
        'provider-3': {
            creditScore: 720,
            products: [],
            reason: 'Insufficient credit history with this provider.'
        }
    },
    'borrower-2': {
        'provider-1': {
            creditScore: 650,
            products: [{...allProducts[0], limit: 200}],
        },
        'provider-2': {
            creditScore: 650,
            products: [],
            reason: 'Credit score below minimum threshold.'
        },
        'provider-3': {
            creditScore: 650,
            products: [{...allProducts[4], limit: 0}],
            reason: 'Existing loan with affiliate provider.'
        }
    }
}


const apiCall = <T>(data: T, delay = 500, fail = false): Promise<T> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (fail) {
        reject({ status: 404, message: 'Not Found' });
      } else {
        resolve(data);
      }
    }, delay);
  });
};

export const getBorrowerByPhone = (phoneNumber: string): Promise<Borrower> => {
  const borrower = borrowers.find(b => b.phoneNumber === phoneNumber.replace(/\D/g, ''));
  return apiCall(borrower, 500, !borrower);
};

export const getProviders = (): Promise<Provider[]> => {
  return apiCall(providers);
};

export const getEligibility = (borrowerId: string, providerId: string): Promise<Eligibility> => {
  const eligibility = eligibilities[borrowerId]?.[providerId];
  return apiCall(eligibility, 800, !eligibility);
};

export const getActiveLoans = (borrowerId: string): Promise<Loan[]> => {
    if (borrowerId === 'borrower-1') {
        return apiCall(loans.filter(l => l.repaymentStatus === 'Unpaid'));
    }
    return apiCall([]);
};

export const getTransactions = (borrowerId: string): Promise<Transaction[]> => {
    if (borrowerId === 'borrower-1') {
        return apiCall(transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
    return apiCall([]);
};

export const applyForLoan = (payload: {
  productId: string;
  borrowerId: string;
  loanAmount: number;
}): Promise<{ success: true, loanId: string }> => {
    console.log('Applying for loan with payload:', payload);
    return apiCall({ success: true, loanId: `loan-${Date.now()}` }, 1500);
}

export const getProductById = (productId: string): EligibilityProduct | undefined => {
    return allProducts.find(p => p.id === productId);
}
