import type { Borrower, Provider, Loan, Transaction, Eligibility, EligibilityProduct } from './types';

// The base URL for your loan application backend.
const API_BASE_URL = 'https://nibterasales.nibbank.com.et';

// --- MOCK DATABASE for data not provided by the backend API ---
const providers: Provider[] = [
  { id: 'provider-1', name: 'Capital Flow' },
  { id: 'provider-2', name: 'Quick-Lend Inc.' },
  { id: 'provider-3', name: 'Evergreen Finance' },
];

const allProducts: EligibilityProduct[] = [
    { id: 'prod_1', name: 'Personal Loan', limit: 0, interestRate: 5, serviceFee: 2.5 },
    { id: 'prod_2', name: 'Emergency Loan', limit: 0, interestRate: 8, serviceFee: 3 },
    // Add other products from your system here.
]
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
  const response = await apiCall<{ id: string, fullName: string, monthlyIncome: number, employmentStatus: string }[]>(`/api/ussd/borrowers?phoneNumber=${phoneNumber}`);
  
  // The API returns an array, we'll take the first result.
  const borrowerData = response[0];
  if (!borrowerData) {
      throw new Error('Borrower not found');
  }

  // Map API response to our app's Borrower type
  return {
    id: borrowerData.id,
    name: borrowerData.fullName,
    phoneNumber: phoneNumber, // The API doesn't return this, so we keep it from the input
    monthlyIncome: borrowerData.monthlyIncome,
    employmentStatus: borrowerData.employmentStatus,
  };
};

export const getProviders = (): Promise<Provider[]> => {
  console.log('[API] Using mock provider list.');
  // Your API spec doesn't include an endpoint for providers, so we'll use a mock list.
  return Promise.resolve(providers);
};

export const getEligibility = async (borrowerId: string, providerId: string): Promise<Eligibility> => {
    console.log(`[API] Fetching eligibility for borrower ${borrowerId} with provider ${providerId}`);
    const eligibilityData = await apiCall<{ score: number, limits: { productId: string, productName: string, limit: number }[] }>(`/api/ussd/borrowers/${borrowerId}/eligibility?providerId=${providerId}`);

    // Map the 'limits' from the API to the 'products' the UI expects
    const products: EligibilityProduct[] = eligibilityData.limits.map(limit => {
        // We get some product details from the static list for now.
        const baseProduct = getProductById(limit.productId) || { interestRate: 0, serviceFee: 0 };
        return {
            id: limit.productId,
            name: limit.productName,
            limit: limit.limit,
            interestRate: baseProduct.interestRate,
            serviceFee: baseProduct.serviceFee,
        };
    });

    return {
        creditScore: eligibilityData.score,
        products,
    };
};

export const getActiveLoans = (borrowerId: string): Promise<Loan[]> => {
    console.log(`[API] Fetching loans for borrower ${borrowerId}`);
    return apiCall(`/api/ussd/borrowers/${borrowerId}/loans`);
};

export const getTransactions = (borrowerId: string): Promise<Transaction[]> => {
    console.log(`[API] Fetching transactions for borrower ${borrowerId}`);
    const transactions = apiCall<any[]>(`/api/ussd/borrowers/${borrowerId}/transactions`);

    // Map API response to our Transaction type
    return transactions.then(txns => txns.map(t => ({
        id: `txn-${t.date}-${t.amount}`, // API doesn't provide an ID, so we create one
        date: new Date(t.date).toISOString(),
        description: t.description,
        amount: t.amount,
        type: t.amount >= 0 ? 'Debit' : 'Credit',
    })))
};

export const applyForLoan = (payload: {
  productId: string;
  borrowerId: string;
  loanAmount: number;
}): Promise<{ success: true, loanId: string }> => {
    console.log('[API] Applying for loan with payload:', payload);

    const product = getProductById(payload.productId);
    if (!product) {
        return Promise.reject(new Error('Product details not found.'));
    }

    const requestBody = {
        productId: payload.productId,
        borrowerId: payload.borrowerId,
        loanAmount: payload.loanAmount,
        serviceFee: product.serviceFee,
        penaltyAmount: 0,
        disbursedDate: new Date().toISOString(),
        // Assuming a 30-day loan term. Adjust as needed.
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), 
        repaymentStatus: 'Unpaid'
    };
    
    return apiCall('/api/loans', {
        method: 'POST',
        body: JSON.stringify(requestBody),
    }).then(() => ({ success: true, loanId: `loan-${Date.now()}` })); // Assuming success if API call doesn't throw
}

export const getProductById = (productId: string): EligibilityProduct | undefined => {
    console.log(`[API] Fetching mock product by ID ${productId}`);
    // This function uses the local mock list. 
    // In a real app, you might have an endpoint to fetch full product details.
    return allProducts.find(p => p.id === productId);
}
