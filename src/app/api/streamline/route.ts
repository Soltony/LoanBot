import { NextResponse } from 'next/server';
import { streamlineLoanApplication } from '@/ai/flows/streamline-loan-application';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Here you might add validation or authentication checks
    const result = await streamlineLoanApplication(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in /api/streamline:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate summary' }, { status: 500 });
  }
}
