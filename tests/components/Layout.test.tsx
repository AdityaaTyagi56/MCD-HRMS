import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Layout from '../../components/Layout';
import { AppProvider } from '../../context/AppContext';
import React from 'react';

// Mock API service
vi.mock('../../services/api', () => ({
  api: {},
  setApiConfig: vi.fn(),
  getApiConfig: vi.fn(() => ({ base: 'http://test', key: 'test' })),
}));

describe('Layout Component', () => {
  const renderLayout = (children: React.ReactNode = <div>Test Content</div>) => {
    return render(
      <AppProvider>
        <Layout>{children}</Layout>
      </AppProvider>
    );
  };

  it('should render children', () => {
    renderLayout(<div>Test Content</div>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should display role toggle', () => {
    renderLayout();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('should display language toggle button', () => {
    renderLayout();
    const languageButtons = screen.getAllByRole('button');
    const languageToggle = languageButtons.find(btn => 
      btn.textContent?.includes('EN') || btn.textContent?.includes('हिं')
    );
    expect(languageToggle).toBeInTheDocument();
  });

  it('should toggle sidebar on mobile menu click', () => {
    renderLayout();
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);
    // Sidebar should be visible now
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('should display admin menu items when role is admin', () => {
    renderLayout();
    // Admin specific items
    expect(screen.getByText(/employees|कर्मचारी/i)).toBeInTheDocument();
    expect(screen.getByText(/payroll|वेतन/i)).toBeInTheDocument();
  });
});