import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '@/components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  it('renders with custom accessibility label', () => {
    const customLabel = 'Loading data...';
    render(<LoadingSpinner accessibilityLabel={customLabel} />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', customLabel);
  });

  it('renders with small size', () => {
    render(<LoadingSpinner size="small" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with large size', () => {
    render(<LoadingSpinner size="large" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('has correct container styling', () => {
    const { container } = render(<LoadingSpinner />);
    
    const spinnerContainer = container.firstChild;
    expect(spinnerContainer).toHaveStyle({
      display: 'flex',
      'justify-content': 'center',
      'align-items': 'center',
      'min-height': '200px',
    });
  });
});
