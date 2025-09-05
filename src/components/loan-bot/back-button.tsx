'use client';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

type BackButtonProps = {
  onClick: () => void;
};

export function BackButton({ onClick }: BackButtonProps) {
  return (
    <Button variant="ghost" onClick={onClick} className="absolute top-4 left-4 md:top-6 md:left-6">
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back
    </Button>
  );
}
