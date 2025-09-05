import type { Borrower, Provider, Loan, Transaction, Eligibility, EligibilityProduct, ProductDetails } from './types';

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
  const url = `https://nibterasales.nibbank.com.et${endpoint}`;
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

    // Handle cases where the response might be empty
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch (error) {
    console.error(`Fetch error for endpoint ${endpoint}:`, error);
    throw error;
  }
};


// --- API FUNCTIONS ---

export const getBorrowerByPhone = async (phoneNumber: string): Promise<Borrower> => {
  console.log(`[API] Fetching borrower for phone number: ${phoneNumber}`);
  // The API returns an array, we expect only one result for a unique phone number.
  const response = await apiCall<{ id: string, fullName: string, monthlyIncome: number, employmentStatus: string }[]>(`/api/ussd/borrowers?phoneNumber=${phoneNumber}`);
  
  const borrowerData = response[0];
  if (!borrowerData) {
      throw new Error('Borrower not found');
  }

  // Map API response to our app's Borrower type
  return {
    id: borrowerData.id,
    name: borrowerData.fullName,
    phoneNumber: phoneNumber,
    monthlyIncome: borrowerData.monthlyIncome,
    employmentStatus: borrowerData.employmentStatus,
  };
};

export const getProviders = async (): Promise<Provider[]> => {
  console.log('[API] Fetching providers from the API.');
  const providers = await apiCall<Provider[]>('/api/providers');
  // Cache providers and products for other functions to use
  allProviders = providers;
  allProducts = providers.flatMap(p => p.products?.map(prod => ({
      ...prod,
      interestRate: prod.dailyFee?.value || 0, // Using dailyFee as interestRate
      limit: prod.maxLoan || 0,
      serviceFee: prod.serviceFee?.value || 0,
  })) || []);
  return providers;
};

export const getEligibility = async (borrowerId: string, providerId: string): Promise<Eligibility> => {
    console.log(`[API] Fetching eligibility for borrower ${borrowerId} with provider ${providerId}`);
    const eligibilityData = await apiCall<{ score: number, limits: { productId: string, productName: string, limit: number }[] }>(`/api/ussd/borrowers/${borrowerId}/eligibility?providerId=${providerId}`);

    // Map the 'limits' from the API to the 'products' the UI expects
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

export const getActiveLoans = (borrowerId: string): Promise<Loan[]> => {
    console.log(`[API] Fetching active loans for borrower ${borrowerId}`);
    // The API response for get loan history returns 'repaidAmount', but the Loan type expects 'amountRepaid'.
    // We will alias it here.
    return apiCall<any[]>(`/api/ussd/borrowers/${borrowerId}/loans`).then(loans => loans.map(l => ({...l, amountRepaid: l.repaidAmount})));
};

export const getTransactions = (borrowerId: string): Promise<Transaction[]> => {
    console.log(`[API] Fetching transactions for borrower ${borrowerId}`);
    return apiCall<any[]>(`/api/ussd/borrowers/${borrowerId}/transactions`).then(txns => txns.map(t => ({
        id: `txn-${t.date}-${t.amount}`, // API doesn't provide an ID, so we create one
        date: new Date(t.date).toISOString(),
        description: t.description,
        amount: t.amount,
        type: t.amount >= 0 ? 'Debit' : 'Credit', // Assuming positive is Debit (disbursement)
    })));
};

export const applyForLoan = async (payload: {
  productId: string;
  borrowerId: string;
  loanAmount: number;
}): Promise<{ success: true, loanId: string }> => {
    console.log('[API] Applying for loan with payload:', payload);

    if (allProducts.length === 0) {
        // Ensure products are loaded if they haven't been already
        await getProviders();
    }
    const product = getProductById(payload.productId);
    if (!product) {
        return Promise.reject(new Error('Product details not found. Cannot calculate fees or terms.'));
    }

    const requestBody = {
        productId: payload.productId,
        borrowerId: payload.borrowerId,
        loanAmount: payload.loanAmount,
        serviceFee: product.serviceFee, // This now comes from the product details
        penaltyAmount: 0,
        disbursedDate: new Date().toISOString(),
        // Assuming a 30-day loan term. Your API may require a different calculation.
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), 
        repaymentStatus: 'Unpaid'
    };
    
    return apiCall('/api/loans', {
        method: 'POST',
        body: JSON.stringify(requestBody),
    }).then(() => ({ success: true, loanId: `loan-${Date.now()}` })); // Assuming success if API call doesn't throw
}

export const getProductById = (productId: string): EligibilityProduct | undefined => {
    console.log(`[API] Getting product by ID ${productId} from cached list.`);
    if (allProducts.length === 0) {
        console.warn('Product list is empty. Call getProviders first.');
        return undefined;
    }
    return allProducts.find(p => p.id === productId);
}
