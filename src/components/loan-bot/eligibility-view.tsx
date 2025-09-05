'use client';
import * as React from 'react';
import { getProviders, getEligibility, getProductById } from '@/lib/mockApi';
import type { Provider, Eligibility, Borrower, EligibilityProduct } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from './back-button';
import { Separator } from '@/components/ui/separator';
import { ApplyLoanDialog } from './apply-loan-dialog';

type EligibilityViewProps = {
  borrower: Borrower;
  onBack: () => void;
};

export function EligibilityView({ borrower, onBack }: EligibilityViewProps) {
  const [providers, setProviders] = React.useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = React.useState<Provider | null>(null);
  const [eligibility, setEligibility] = React.useState<Eligibility | null>(null);
  const [isLoadingProviders, setIsLoadingProviders] = React.useState(true);
  const [isLoadingEligibility, setIsLoadingEligibility] = React.useState(false);
  const [showApplyDialog, setShowApplyDialog] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<EligibilityProduct | null>(null);

  React.useEffect(() => {
    async function fetchProviders() {
      setIsLoadingProviders(true);
      const providerList = await getProviders();
      setProviders(providerList);
      setIsLoadingProviders(false);
    }
    fetchProviders();
  }, []);

  const handleProviderSelect = async (provider: Provider) => {
    setSelectedProvider(provider);
    setIsLoadingEligibility(true);
    setEligibility(null);
    const eligibilityData = await getEligibility(borrower.id, provider.id);
    setEligibility(eligibilityData);
    setIsLoadingEligibility(false);
  };
  
  const handleApplyClick = (productId: string) => {
    const product = getProductById(productId);
    if(product && eligibility?.products) {
        const eligibilityProduct = eligibility.products.find(p => p.id === productId);
        if(eligibilityProduct) {
            setSelectedProduct(eligibilityProduct);
            setShowApplyDialog(true);
        }
    }
  }

  const handleBack = () => {
    if (selectedProvider) {
      setSelectedProvider(null);
      setEligibility(null);
    } else {
      onBack();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 relative">
      <BackButton onClick={handleBack} />
      <div className="text-center mb-8 pt-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {selectedProvider ? `Eligibility with ${selectedProvider.name}` : 'Check Loan Eligibility'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {selectedProvider ? `Your results for ${borrower.name}.` : 'First, please select a loan provider.'}
        </p>
      </div>

      {!selectedProvider && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoadingProviders
            ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            : providers.map(provider => (
                <Card
                  key={provider.id}
                  onClick={() => handleProviderSelect(provider)}
                  className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-shadow flex items-center justify-center p-6"
                >
                  <CardTitle>{provider.name}</CardTitle>
                </Card>
              ))}
        </div>
      )}

      {isLoadingEligibility && (
        <div className="space-y-4 mt-6">
            <Skeleton className="h-12 w-1/3 mx-auto" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
        </div>
      )}

      {eligibility && (
        <>
          <Card className="mb-6 bg-secondary/50">
            <CardHeader className="text-center">
              <CardDescription>Your Credit Score</CardDescription>
              <CardTitle className="text-5xl">{eligibility.creditScore}</CardTitle>
            </CardHeader>
          </Card>
          
          <h2 className="text-xl font-semibold mb-4 text-center">Available Products</h2>

          {eligibility.products.length > 0 ? (
            <div className="space-y-4">
              {eligibility.products.map(product => (
                <Card key={product.id}>
                  <CardHeader>
                    <CardTitle>{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Max. Loan Amount</p>
                        <p className="text-xl font-bold">${product.limit.toLocaleString()}</p>
                    </div>
                     <div>
                        <p className="text-sm text-muted-foreground">Interest Rate</p>
                        <p className="text-xl font-bold">{product.interestRate}%</p>
                    </div>
                  </CardContent>
                  {product.limit > 0 && (
                    <CardFooter>
                      <Button onClick={() => handleApplyClick(product.id)}>Apply Now</Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-lg font-medium">No products available for you at this time.</p>
                {eligibility.reason && <p className="text-muted-foreground mt-2">{eligibility.reason}</p>}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {selectedProduct && <ApplyLoanDialog 
        open={showApplyDialog}
        onOpenChange={setShowApplyDialog}
        product={selectedProduct}
        borrower={borrower}
      />}
    </div>
  );
}
