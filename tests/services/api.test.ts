import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, setApiConfig, getApiConfig } from '../../services/api';
import type { Employee, Grievance, LeaveRequest } from '../../types';

// Mock fetch globally
global.fetch = vi.fn();

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setApiConfig({ base: 'http://test-api.com', key: 'test-key' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Configuration', () => {
    it('should set and get API config', () => {
      setApiConfig({ base: 'http://new-api.com', key: 'new-key' });
      const config = getApiConfig();
      expect(config.base).toBe('http://new-api.com');
      expect(config.key).toBe('new-key');
    });

    it('should persist config to localStorage', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      setApiConfig({ base: 'http://stored-api.com', key: 'stored-key' });
      expect(setItemSpy).toHaveBeenCalledWith('apiBase', 'http://stored-api.com');
      expect(setItemSpy).toHaveBeenCalledWith('apiKey', 'stored-key');
    });
  });

  describe('Health Check', () => {
    it('should call health endpoint successfully', async () => {
      const mockResponse = { ok: true, uptime: 12345, timestamp: '2025-01-01T00:00:00Z' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.health();
      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/health',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-key',
          }),
        })
      );
    });

    it('should handle health check failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(api.health()).rejects.toThrow();
    });
  });

  describe('Employee Management', () => {
    it('should list employees successfully', async () => {
      const mockEmployees: Partial<Employee>[] = [
        { id: 1, name: 'Test User', role: 'Developer', department: 'Engineering' },
      ];
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmployees,
      });

      const result = await api.listEmployees();
      expect(result).toEqual(mockEmployees);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/api/employees',
        expect.any(Object)
      );
    });

    it('should mark attendance successfully', async () => {
      const payload = { userId: 1, lat: 28.6328, lng: 77.2197 };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await api.markAttendance(payload);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/api/attendance/mark',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        })
      );
    });
  });

  describe('Grievance Management', () => {
    it('should submit grievance successfully', async () => {
      const grievance = {
        userId: 1,
        user: 'Test User',
        category: 'Equipment',
        description: 'Equipment issue',
        priority: 'High' as const,
      };
      const mockResponse: Grievance = {
        ...grievance,
        id: 1,
        status: 'Pending',
        date: '2025-01-01',
        submittedAt: '2025-01-01T00:00:00Z',
        escalationLevel: 0,
        slaBreach: false,
      };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.submitGrievance(grievance);
      expect(result).toEqual(mockResponse);
    });

    it('should update grievance status', async () => {
      const mockResponse: Grievance = {
        id: 1,
        userId: 1,
        user: 'Test User',
        category: 'Equipment',
        description: 'Test',
        status: 'Resolved',
        priority: 'High',
        date: '2025-01-01',
        submittedAt: '2025-01-01T00:00:00Z',
        escalationLevel: 0,
        slaBreach: false,
      };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.updateGrievanceStatus(1, 'Resolved');
      expect(result.status).toBe('Resolved');
    });
  });

  describe('Leave Management', () => {
    it('should create leave request', async () => {
      const leaveRequest = {
        userId: 1,
        startDate: '2025-02-01',
        endDate: '2025-02-05',
        type: 'Medical' as const,
        reason: 'Health issue',
      };
      const mockResponse: LeaveRequest = {
        ...leaveRequest,
        id: 1,
        userName: 'Test User',
        status: 'Pending',
        requestDate: '2025-01-01',
      };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.createLeave(leaveRequest);
      expect(result).toEqual(mockResponse);
    });

    it('should update leave status', async () => {
      const mockResponse: LeaveRequest = {
        id: 1,
        userId: 1,
        userName: 'Test User',
        startDate: '2025-02-01',
        endDate: '2025-02-05',
        type: 'Medical',
        reason: 'Health',
        status: 'Approved',
        requestDate: '2025-01-01',
      };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.updateLeaveStatus(1, 'Approved');
      expect(result.status).toBe('Approved');
    });
  });

  describe('Error Handling', () => {
    it('should throw error on network failure', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      await expect(api.health()).rejects.toThrow('Network error');
    });

    it('should throw error on 404', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });
      await expect(api.health()).rejects.toThrow('Not Found');
    });

    it('should throw error on 401 unauthorized', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });
      await expect(api.health()).rejects.toThrow('Unauthorized');
    });
  });
});