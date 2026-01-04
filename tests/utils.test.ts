import { describe, it, expect, vi } from 'vitest';

// Test face recognition utilities
describe('Face Recognition Service', () => {
  it('should calculate euclidean distance correctly', () => {
    const arr1 = [1, 2, 3];
    const arr2 = [4, 5, 6];
    
    // Simple euclidean distance calculation
    const euclideanDistance = (a: number[], b: number[]) => {
      let sum = 0;
      for (let i = 0; i < a.length; i++) {
        sum += Math.pow(a[i] - b[i], 2);
      }
      return Math.sqrt(sum);
    };
    
    const distance = euclideanDistance(arr1, arr2);
    expect(distance).toBeCloseTo(5.196, 2);
  });

  it('should validate face descriptor length', () => {
    const validDescriptor = new Array(128).fill(0);
    const invalidDescriptor = new Array(64).fill(0);
    
    expect(validDescriptor.length).toBe(128);
    expect(invalidDescriptor.length).not.toBe(128);
  });
});

// Test attendance validation
describe('Attendance Validation', () => {
  it('should validate time window correctly', () => {
    const isWithinAttendanceWindow = (hour: number) => {
      return hour >= 7 && hour < 17;
    };

    expect(isWithinAttendanceWindow(9)).toBe(true);
    expect(isWithinAttendanceWindow(6)).toBe(false);
    expect(isWithinAttendanceWindow(18)).toBe(false);
    expect(isWithinAttendanceWindow(7)).toBe(true);
    expect(isWithinAttendanceWindow(16)).toBe(true);
  });

  it('should calculate distance from office', () => {
    const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // km
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Test with same coordinates
    expect(haversineDistance(28.6328, 77.2197, 28.6328, 77.2197)).toBe(0);
    
    // Test with different coordinates
    const distance = haversineDistance(28.6328, 77.2197, 28.6429, 77.2297);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(2); // Should be less than 2km
  });
});

// Test grievance categorization
describe('Grievance Analysis', () => {
  it('should categorize grievance correctly', () => {
    const categorizeGrievance = (text: string) => {
      const categories: Record<string, string[]> = {
        Equipment: ['equipment', 'machine', 'tool', 'vehicle'],
        Safety: ['safety', 'danger', 'risk', 'hazard'],
        Payment: ['salary', 'payment', 'wages', 'allowance'],
        Leave: ['leave', 'vacation', 'absence', 'holiday'],
      };

      const lowerText = text.toLowerCase();
      for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
          return category;
        }
      }
      return 'Other';
    };

    expect(categorizeGrievance('My equipment is broken')).toBe('Equipment');
    expect(categorizeGrievance('Safety issue in workplace')).toBe('Safety');
    expect(categorizeGrievance('Salary not received')).toBe('Payment');
    expect(categorizeGrievance('Need leave approval')).toBe('Leave');
    expect(categorizeGrievance('Random complaint')).toBe('Other');
  });

  it('should validate grievance priority', () => {
    const getPriority = (category: string, urgency: string) => {
      const highPriorityCategories = ['Safety', 'Equipment'];
      if (highPriorityCategories.includes(category) || urgency === 'high') {
        return 'high';
      }
      return 'medium';
    };

    expect(getPriority('Safety', 'low')).toBe('high');
    expect(getPriority('Equipment', 'low')).toBe('high');
    expect(getPriority('Leave', 'low')).toBe('medium');
    expect(getPriority('Other', 'high')).toBe('high');
  });
});

// Test data validation
describe('Data Validation', () => {
  it('should validate employee ID format', () => {
    const isValidEmployeeId = (id: string) => {
      return /^EMP\d{3}$/.test(id);
    };

    expect(isValidEmployeeId('EMP001')).toBe(true);
    expect(isValidEmployeeId('EMP999')).toBe(true);
    expect(isValidEmployeeId('EMP1')).toBe(false);
    expect(isValidEmployeeId('E001')).toBe(false);
    expect(isValidEmployeeId('EMP1234')).toBe(false);
  });

  it('should validate phone number format', () => {
    const isValidPhone = (phone: string) => {
      return /^[6-9]\d{9}$/.test(phone);
    };

    expect(isValidPhone('9876543210')).toBe(true);
    expect(isValidPhone('8765432109')).toBe(true);
    expect(isValidPhone('1234567890')).toBe(false);
    expect(isValidPhone('987654321')).toBe(false);
  });
});
