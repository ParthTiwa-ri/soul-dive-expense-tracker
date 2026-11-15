import { describe, it, expect } from 'vitest';
import {
  POST as syncExpenseHandler,
  GET as getExpensesHandler,
  DELETE as deleteExpenseHandler,
} from '../src/app/api/sync/expenses/route';

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

  it('should delete expense and exclude it from GET responses consistently', async () => {
    const toDeleteUuid = 'test-delete-uuid-' + Date.now();
    await syncExpenseHandler({
      json: async () => ({
        clientUuid: toDeleteUuid,
        amountPaise: 150000,
        currency: 'INR',
        description: 'खर्चा जिसे डिलीट करना है',
        categoryId: 'cat-bricks-cement',
        phaseId: 'phase-construction',
        paymentMethod: 'cash',
        paymentDate: '2026-11-15',
        paidByUserId: '11111111-1111-1111-1111-111111111111',
        paidByName: 'कृष्ण मुरारी तिवारी',
        submittedByUserId: '11111111-1111-1111-1111-111111111111',
        submittedByName: 'कृष्ण मुरारी तिवारी',
        deviceCreatedAt: new Date().toISOString(),
      }),
    } as any);

    // Call DELETE
    const deleteRes = await deleteExpenseHandler({
      url: `http://localhost:3000/api/sync/expenses?clientUuid=${toDeleteUuid}`,
      json: async () => ({ clientUuid: toDeleteUuid }),
    } as any);
    expect(deleteRes.status).toBe(200);

    // Verify GET does not contain it
    const getRes = await getExpensesHandler();
    const getData = await getRes.json();
    const found = getData.records.find((r: any) => (r.clientUuid || r.client_uuid) === toDeleteUuid);
    expect(found).toBeUndefined();
  });

  it('should synchronize edits and verification approvals on existing records', async () => {
    const editUuid = 'test-edit-uuid-' + Date.now();
    const initialPayload = {
      clientUuid: editUuid,
      amountPaise: 300000, // ₹3,000
      currency: 'INR',
      description: 'पाइप फिटिंग सामग्री',
      categoryId: 'cat-plumbing',
      phaseId: 'phase-construction',
      paymentMethod: 'cash',
      paymentDate: '2026-11-15',
      paidByUserId: '11111111-1111-1111-1111-111111111111',
      paidByName: 'कृष्ण मुरारी तिवारी',
      submittedByUserId: '11111111-1111-1111-1111-111111111111',
      submittedByName: 'कृष्ण मुरारी तिवारी',
      verificationStatus: 'pending',
      deviceCreatedAt: new Date().toISOString(),
    };

    // 1. Initial creation
    const res1 = await syncExpenseHandler({ json: async () => initialPayload } as any);
    expect(res1.status).toBe(200);

    // 2. Owner edits amount to ₹3,500 and approves
    const updatedPayload = {
      ...initialPayload,
      amountPaise: 350000, // ₹3,500
      description: 'पाइप फिटिंग सामग्री एवं एल्बो',
      verificationStatus: 'verified',
      verifiedByUserId: '22222222-2222-2222-2222-222222222222',
      verifiedByName: 'Manu Shukla',
      verifiedAt: new Date().toISOString(),
    };

    const res2 = await syncExpenseHandler({ json: async () => updatedPayload } as any);
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.status).toBe('synced');

    // 3. Verify GET reflects updated amount and verified status
    const getRes = await getExpensesHandler();
    const getData = await getRes.json();
    const record = getData.records.find((r: any) => (r.clientUuid || r.client_uuid) === editUuid);
    expect(record).toBeDefined();
    expect(Number(record.amountPaise || record.amount_paise)).toBe(350000);
    expect(record.description).toBe('पाइप फिटिंग सामग्री एवं एल्बो');
    expect(record.verificationStatus || record.verification_status).toBe('verified');
  });
});

