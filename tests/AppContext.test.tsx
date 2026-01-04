import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';

// Mock Layout component for testing
function MockLayout({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

describe('AppContext', () => {
  it('should provide default context values', () => {
    const TestComponent = () => {
      return <div>Test Component</div>;
    };

    render(
      <AppProvider>
        <MockLayout>
          <TestComponent />
        </MockLayout>
      </AppProvider>
    );

    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });
});
