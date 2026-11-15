import { describe, it, expect } from 'vitest';
import { POST as syncExpenseHandler } from '../src/app/api/sync/expenses/route';

describe('Server Idempotent Sync API (/api/sync/expenses)', () => {
  it('should accept a new valid expense and return 200 with synced status', async () => {
    const testUuid = 'test-uuid-' + Date.now();
    const req = {
      json: async () => ({
        clientUuid: testUuid,
        amountPaise: 500000,
        currency: 'INR',
        description: 'सीमेंट की ५० बोरी',
        categoryId: 'cat-bricks-cement',
        phaseId: 'phase-construction',
        paymentMethod: 'upi',
        paymentDate: '2026-11-15',
        paidByUserId: '11111111-1111-1111-1111-111111111111',
        paidByName: 'कृष्ण मुरारी तिवारी',
        submittedByUserId: '11111111-1111-1111-1111-111111111111',
        submittedByName: 'कृष्ण मुरारी तिवारी',
        deviceCreatedAt: new Date().toISOString(),
      }),
    } as any;

    const res = await syncExpenseHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.clientUuid).toBe(testUuid);
    expect(data.status).toBe('synced');
    expect(data.serverCreatedAt).toBeDefined();
  });

  it('should handle duplicate submission idempotently without creating duplicate ledger records', async () => {
    const idempotentUuid = 'idempotent-test-uuid-123';
    const payload = {
      clientUuid: idempotentUuid,
      amountPaise: 250000,
      currency: 'INR',
      description: 'रेत की ट्रॉली',
      categoryId: 'cat-bricks-cement',
      phaseId: 'phase-construction',
      paymentMethod: 'cash',
      paymentDate: '2026-11-15',
      paidByUserId: '11111111-1111-1111-1111-111111111111',
      paidByName: 'कृष्ण मुरारी तिवारी',
      submittedByUserId: '11111111-1111-1111-1111-111111111111',
      submittedByName: 'कृष्ण मुरारी तिवारी',
      deviceCreatedAt: new Date().toISOString(),
    };

    // First Call
    const res1 = await syncExpenseHandler({ json: async () => payload } as any);
    const data1 = await res1.json();
    expect(res1.status).toBe(200);

    // Second Call with identical clientUuid
    const res2 = await syncExpenseHandler({ json: async () => payload } as any);
    const data2 = await res2.json();
    expect(res2.status).toBe(200);

    // Must return the exact same server ID
    expect(data2.id).toBe(data1.id);
    expect(data2.message).toContain('Idempotent hit');
  });

  it('should reject non-positive amounts', async () => {
    const invalidPayload = {
      clientUuid: 'invalid-zero-amount',
      amountPaise: 0,
    };

    const res = await syncExpenseHandler({ json: async () => invalidPayload } as any);
    expect(res.status).toBe(400);
  });
});

