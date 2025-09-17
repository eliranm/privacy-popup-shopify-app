'use client';

import { Spinner, Box } from '@shopify/polaris';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  accessibilityLabel?: string;
}

export default function LoadingSpinner({ 
  size = 'large', 
  accessibilityLabel = 'Loading' 
}: LoadingSpinnerProps) {
  return (
    <Box 
      padding="8" 
      display="flex" 
      justifyContent="center" 
      alignItems="center"
      minHeight="200px"
    >
      <Spinner accessibilityLabel={accessibilityLabel} size={size} />
    </Box>
  );
}
