import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Attendance Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GPS Verification', () => {
    it('should verify employee is within office radius', () => {
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

      const officeLat = 28.6328;
      const officeLng = 77.2197;
      const officeRadius = 0.5; // 500m

      // Employee within radius
      const employeeLat = 28.6330;
      const employeeLng = 77.2195;
      const distance = haversineDistance(officeLat, officeLng, employeeLat, employeeLng);
      
      expect(distance).toBeLessThan(officeRadius);
    });

    it('should detect employee outside office radius', () => {
      const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
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

      const officeLat = 28.6328;
      const officeLng = 77.2197;
      const officeRadius = 0.5;

      // Employee far away
      const employeeLat = 28.7000;
      const employeeLng = 77.3000;
      const distance = haversineDistance(officeLat, officeLng, employeeLat, employeeLng);
      
      expect(distance).toBeGreaterThan(officeRadius);
    });
  });

  describe('Anti-Spoofing Detection', () => {
    it('should detect static GPS coordinates', () => {
      const pings = [
        { lat: 28.6328, lng: 77.2197, accuracy: 10 },
        { lat: 28.6328, lng: 77.2197, accuracy: 10 },
        { lat: 28.6328, lng: 77.2197, accuracy: 10 },
        { lat: 28.6328, lng: 77.2197, accuracy: 10 },
      ];

      // All pings are identical - suspicious
      const allIdentical = pings.every(
        (ping, i, arr) => i === 0 || (ping.lat === arr[i-1].lat && ping.lng === arr[i-1].lng)
      );

      expect(allIdentical).toBe(true);
    });

    it('should accept natural GPS drift', () => {
      const pings = [
        { lat: 28.6328, lng: 77.2197, accuracy: 10 },
        { lat: 28.63281, lng: 77.21971, accuracy: 12 },
        { lat: 28.63279, lng: 77.21969, accuracy: 11 },
        { lat: 28.63282, lng: 77.21972, accuracy: 9 },
      ];

      // Pings have natural variation
      const hasVariation = !pings.every(
        (ping, i, arr) => i === 0 || (ping.lat === arr[i-1].lat && ping.lng === arr[i-1].lng)
      );

      expect(hasVariation).toBe(true);
    });

    it('should detect suspiciously round numbers', () => {
      const isRoundNumber = (num: number) => {
        const str = num.toString();
        const decimalPart = str.split('.')[1] || '';
        return decimalPart.length <= 2 || /^[05]+$/.test(decimalPart);
      };

      expect(isRoundNumber(28.63)).toBe(true);
      expect(isRoundNumber(77.50)).toBe(true);
      expect(isRoundNumber(28.632845)).toBe(false);
    });

    it('should detect poor GPS accuracy', () => {
      const pings = [
        { lat: 28.6328, lng: 77.2197, accuracy: 150 }, // Poor accuracy
        { lat: 28.6328, lng: 77.2197, accuracy: 200 },
      ];

      const poorAccuracy = pings.some(ping => ping.accuracy > 100);
      expect(poorAccuracy).toBe(true);
    });
  });

  describe('Time Window Validation', () => {
    it('should allow attendance during work hours (7 AM - 5 PM)', () => {
      const isWithinWindow = (hour: number) => hour >= 7 && hour < 17;
      
      expect(isWithinWindow(7)).toBe(true);
      expect(isWithinWindow(12)).toBe(true);
      expect(isWithinWindow(16)).toBe(true);
    });

    it('should reject attendance outside work hours', () => {
      const isWithinWindow = (hour: number) => hour >= 7 && hour < 17;
      
      expect(isWithinWindow(6)).toBe(false);
      expect(isWithinWindow(17)).toBe(false);
      expect(isWithinWindow(22)).toBe(false);
    });
  });
});