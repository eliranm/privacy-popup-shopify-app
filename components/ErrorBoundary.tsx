'use client';

import { Component, ReactNode, ErrorInfo } from 'react';
import { Banner, Card, Stack, Text, Button } from '@shopify/polaris';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // You could log this to an error reporting service here
    if (process.env.NODE_ENV === 'production') {
      // Log to error reporting service
      console.error('Production error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card>
          <Stack vertical spacing="loose">
            <Banner
              title="Something went wrong"
              status="critical"
            >
              <Text as="p">
                An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
              </Text>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details style={{ marginTop: '1rem' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                    Error Details (Development)
                  </summary>
                  <pre style={{ 
                    marginTop: '0.5rem', 
                    padding: '1rem', 
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    fontSize: '12px',
                    overflow: 'auto',
                    maxHeight: '200px'
                  }}>
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </Banner>
            
            <Stack distribution="leading">
              <Button onClick={this.handleReload} primary>
                Reload Page
              </Button>
              <Button onClick={this.handleReset} outline>
                Try Again
              </Button>
            </Stack>
          </Stack>
        </Card>
      );
    }

    return this.props.children;
  }
}
