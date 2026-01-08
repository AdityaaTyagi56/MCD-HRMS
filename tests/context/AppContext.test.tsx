import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AppProvider, useApp } from '../../context/AppContext';
import React from 'react';

// Mock API service
vi.mock('../../services/api', () => ({
  api: {
    submitGrievance: vi.fn().mockResolvedValue({ id: 1, status: 'Pending' }),
    updateGrievanceStatus: vi.fn().mockResolvedValue({ id: 1, status: 'Resolved' }),
    markAttendance: vi.fn().mockResolvedValue({}),
    createLeave: vi.fn().mockResolvedValue({ id: 1, status: 'Pending' }),
    updateLeaveStatus: vi.fn().mockResolvedValue({ id: 1, status: 'Approved' }),
    releaseAllSalaries: vi.fn().mockResolvedValue({}),
  },
  setApiConfig: vi.fn(),
  getApiConfig: vi.fn(() => ({ base: 'http://test', key: 'test' })),
}));

describe('AppContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppProvider>{children}</AppProvider>
  );

  describe('Role Management', () => {
    it('should initialize with admin role', () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      expect(result.current.currentRole).toBe('admin');
    });

    it('should switch role', () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      
      act(() => {
        result.current.switchRole('employee');
      });
      
      expect(result.current.currentRole).toBe('employee');
    });

    it('should reset view to dashboard on role switch', () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      
      act(() => {
        result.current.setCurrentView('employees');
      });
      expect(result.current.currentView).toBe('employees');
      
      act(() => {
        result.current.switchRole('employee');
      });
      
      expect(result.current.currentView).toBe('dashboard');
    });
  });

  describe('Language Management', () => {
    it('should initialize with Hindi language', () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      expect(result.current.language).toBe('hi');
    });

    it('should toggle language', () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      
      act(() => {
        result.current.toggleLanguage();
      });
      
      expect(result.current.language).toBe('en');
      
      act(() => {
        result.current.toggleLanguage();
      });
      
      expect(result.current.language).toBe('hi');
    });

    it('should translate keys correctly', () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      
      // Hindi translation
      expect(result.current.t('mark_attendance')).toBe('उपस्थिति दर्ज करें');
      
      act(() => {
        result.current.toggleLanguage();
      });
      
      // English translation
      expect(result.current.t('mark_attendance')).toBe('Mark Attendance');
    });

    it('should return key for missing translation', () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      expect(result.current.t('non_existent_key')).toBe('non_existent_key');
    });
  });

  describe('View Navigation', () => {
    it('should change current view', () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      
      act(() => {
        result.current.setCurrentView('employees');
      });
      
      expect(result.current.currentView).toBe('employees');
    });
  });

  describe('Grievance Management', () => {
    it('should add grievance', async () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      const initialCount = result.current.grievances.length;
      
      await act(async () => {
        await result.current.addGrievance({
          userId: 1,
          category: 'Equipment',
          description: 'Test grievance',
          priority: 'High',
        });
      });
      
      await waitFor(() => {
        expect(result.current.grievances.length).toBe(initialCount + 1);
      });
    });

    it('should resolve grievance', async () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      const grievanceId = result.current.grievances[0]?.id;
      
      if (grievanceId) {
        await act(async () => {
          await result.current.resolveGrievance(grievanceId);
        });
        
        await waitFor(() => {
          const resolved = result.current.grievances.find(g => g.id === grievanceId);
          expect(resolved?.status).toBe('Resolved');
        });
      }
    });
  });

  describe('Attendance Management', () => {
    it('should mark attendance', async () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      const coords = { lat: 28.6328, lng: 77.2197 };
      
      await act(async () => {
        await result.current.markAttendance(1, coords);
      });
      
      await waitFor(() => {
        const employee = result.current.employees.find(e => e.id === 1);
        expect(employee?.status).toBe('Present');
        expect(employee?.coords).toEqual(coords);
      });
    });
  });

  describe('Leave Management', () => {
    it('should apply for leave', async () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      const initialCount = result.current.leaves.length;
      
      await act(async () => {
        await result.current.applyForLeave({
          userId: 1,
          startDate: '2025-02-01',
          endDate: '2025-02-05',
          type: 'Medical',
          reason: 'Health issue',
        });
      });
      
      await waitFor(() => {
        expect(result.current.leaves.length).toBe(initialCount + 1);
      });
    });

    it('should update leave status', async () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      const leaveId = result.current.leaves[0]?.id;
      
      if (leaveId) {
        await act(async () => {
          await result.current.updateLeaveStatus(leaveId, 'Approved');
        });
        
        await waitFor(() => {
          const leave = result.current.leaves.find(l => l.id === leaveId);
          expect(leave?.status).toBe('Approved');
        });
      }
    });
  });

  describe('Payroll Management', () => {
    it('should release all salaries', async () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      
      await act(async () => {
        await result.current.releaseAllSalaries();
      });
      
      await waitFor(() => {
        const allPaid = result.current.payslips.every(p => p.status === 'Paid');
        expect(allPaid).toBe(true);
      });
    });
  });

  describe('API Configuration', () => {
    it('should set API base URL', () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      
      act(() => {
        result.current.setApiBase('http://new-api.com');
      });
      
      expect(result.current.apiBase).toBe('http://new-api.com');
    });

    it('should set API key', () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      
      act(() => {
        result.current.setApiKey('new-key');
      });
      
      expect(result.current.apiKey).toBe('new-key');
    });
  });
});