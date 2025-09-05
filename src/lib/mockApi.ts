'use client';
import type { Borrower, Provider, Loan, Transaction, Eligibility, EligibilityProduct, ProductDetails } from './types';

// The base URL for your loan application backend.
const API_BASE_URL = '/api';

// --- MOCK DATABASE for data not provided by the backend API ---
let allProducts: EligibilityProduct[] = [];
let allProviders: Provider[] = [];

// --- END MOCK DATABASE ---

/**
 * A generic helper function for making API calls.
 * @param endpoint The API endpoint to call.
 * @param options The options for the fetch request.
 * @returns The JSON response from the API.
 */
const apiCall = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Request failed: ${response.status}`);
    }

    const text = await response.text();
    if (!text) {
        return {} as T;
    }
    return JSON.parse(text) as T;
  } catch (error) {
    console.error(`Fetch error for endpoint ${endpoint}:`, error);
    throw error;
  }
};


// --- API FUNCTIONS ---

export const getBorrowerByPhone = async (phoneNumber: string): Promise<Borrower> => {
  console.log(`[API] Original phone number: ${phoneNumber}`);
  const formattedPhoneNumber = phoneNumber.slice(-9);
  console.log(`[API] Formatted phone number for API call: ${formattedPhoneNumber}`);

  try {
    const response = await apiCall<{ borrowerId: string; provisionedData: { data: string }[] }>(`/ussd/borrowers?phoneNumber=${formattedPhoneNumber}`);
    
    console.log('[API] Full response received for borrower:', response);

    if (!response || !response.provisionedData || response.provisionedData.length === 0) {
        console.error('[API] Borrower not found or provisionedData is missing/empty in the response.');
        throw new Error('Borrower not found or provisioned data is missing.');
    }

    const provisionedDataString = response.provisionedData[0].data;
    console.log('[API] Provisioned data string:', provisionedDataString);
    
    const provisionedData = JSON.parse(provisionedDataString);
    console.log('[API] Parsed provisioned data:', provisionedData);

    const borrower: Borrower = {
        id: response.borrowerId,
        name: provisionedData.name,
        phoneNumber: phoneNumber,
        monthlyIncome: provisionedData.salary,
        employmentStatus: 'Employed',
    };

    console.log('[API] Successfully mapped to Borrower object:', borrower);
    return borrower;

  } catch(err) {
      console.error('[API] Error in getBorrowerByPhone:', err);
      throw err;
  }
};


export const getProviders = async (): Promise<Provider[]> => {
  console.log('[API] Fetching providers from the API.');
  const providers = await apiCall<Provider[]>('/providers');
  allProviders = providers;
  allProducts = providers.flatMap(p => p.products?.map(prod => ({
      ...prod,
      interestRate: prod.dailyFee?.value || 0,
      limit: prod.maxLoan || 0,
      serviceFee: prod.serviceFee?.value || 0,
  })) || []);
  return providers;
};

export const getEligibility = async (borrowerId: string, providerId: string): Promise<Eligibility> => {
    console.log(`[API] Fetching eligibility for borrower ${borrowerId} with provider ${providerId}`);
    const eligibilityData = await apiCall<{ score: number, limits: { productId: string, productName: string, limit: number }[] }>(`/ussd/borrowers/${borrowerId}/eligibility?providerId=${providerId}`);

    const products: EligibilityProduct[] = eligibilityData.limits.map(limit => {
        const baseProduct = getProductById(limit.productId);
        return {
            id: limit.productId,
            name: limit.productName,
            limit: limit.limit,
            interestRate: baseProduct?.interestRate || 0,
            serviceFee: baseProduct?.serviceFee || 0,
        };
    });

    return {
        creditScore: eligibilityData.score,
        products,
    };
};

export const getActiveLoans = async (borrowerId: string): Promise<Loan[]> => {
    console.log(`[API] Fetching active loans for borrower ${borrowerId}`);
    const rawLoans = await apiCall<any[]>(`/ussd/borrowers/${borrowerId}/loans`);

    const loans = rawLoans.map(loan => ({
        ...loan,
        amountRepaid: loan.repaidAmount || 0,
        // The backend provides the final repayable amount. Fallback to loanAmount if not present.
        totalRepayableAmount: loan.totalRepayableAmount || loan.loanAmount, 
    }));

    return loans;
};


export const getTransactions = (borrowerId: string): Promise<Transaction[]> => {
    console.log(`[API] Fetching transactions for borrower ${borrowerId}`);
    return apiCall<any[]>(`/ussd/borrowers/${borrowerId}/transactions`).then(txns => txns.map(t => ({
        id: `txn-${t.date}-${t.amount}`,
        date: new Date(t.date).toISOString(),
        description: t.description,
        amount: t.amount,
        type: t.amount >= 0 ? 'Debit' : 'Credit',
    })));
};

export const applyForLoan = async (payload: {
  productId: string;
  borrowerId: string;
  loanAmount: number;
}): Promise<{ success: true, loanId: string }> => {
    console.log('[API] Applying for loan with payload:', payload);

    const requestBody = {
        productId: payload.productId,
        borrowerId: payload.borrowerId,
        loanAmount: payload.loanAmount,
        disbursedDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    
    return apiCall('/loans', {
        method: 'POST',
        body: JSON.stringify(requestBody),
    }).then(() => ({ success: true, loanId: `loan-${Date.now()}` }));
}

export const repayLoan = async (loanId: string, amount: number): Promise<Loan> => {
    console.log(`[API] Repaying loan ${loanId} with amount ${amount}`);
    const requestBody = { loanId, amount };
    return apiCall<Loan>('/payments', {
        method: 'POST',
        body: JSON.stringify(requestBody)
    });
};

export const getProductById = (productId: string): EligibilityProduct | undefined => {
    console.log(`[API] Getting product by ID ${productId} from cached list.`);
    if (allProducts.length === 0) {
        console.warn('Product list is empty. Call getProviders first.');
        return undefined;
    }
    return allProducts.find(p => p.id === productId);
}
