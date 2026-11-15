import { describe, it, expect } from 'vitest';
import { POST, GET, DELETE } from '../src/app/api/sync/expenses/route';
import { SUPER_ADMIN_SECRET_PIN, formatINR } from '../src/lib/constants';

describe('Comprehensive Multi-Device Edge Cases Suite', () => {
  it('1. Integer Paise: Formats currency without any floating-point error', () => {
    const paise = 500050; // ₹5,000.50
    const formatted = formatINR(paise, true);
    expect(formatted).toContain('5,000.50');

    const largePaise = 15000000; // ₹1,50,000
    expect(formatINR(largePaise)).toContain('1,50,000');
  });

  it('2. Validation: Rejects missing clientUuid with 400', async () => {
    const res = await POST({
      json: async () => ({ amountPaise: 100000, description: 'Test' }),
    } as any);
    expect(res.status).toBe(400);
  });

  it('3. Validation: Rejects zero and negative amounts with 400', async () => {
    const resZero = await POST({
      json: async () => ({ clientUuid: 'uuid-zero-123', amountPaise: 0 }),
    } as any);
    expect(resZero.status).toBe(400);

    const resNeg = await POST({
      json: async () => ({ clientUuid: 'uuid-neg-123', amountPaise: -500 }),
    } as any);
    expect(resNeg.status).toBe(400);
  });

  it('4. Idempotency: Multiple submissions with same clientUuid return identical server ID', async () => {
    const testUuid = 'edge-case-test-' + Date.now();
    const payload = {
      clientUuid: testUuid,
      amountPaise: 450000,
      currency: 'INR',
      description: '५० बोरी सीमेंट अल्ट्राटेक',
      categoryId: 'cat-bricks-cement',
      phaseId: 'phase-construction',
      paymentMethod: 'cash',
      paymentDate: '2026-11-15',
      paidByUserId: '11111111-1111-1111-1111-111111111111',
      paidByName: 'कृष्ण मुरारी तिवारी',
      submittedByUserId: '11111111-1111-1111-1111-111111111111',
      submittedByName: 'कृष्ण मुरारी तिवारी',
      deviceCreatedAt: new Date().toISOString(),
      recordType: 'expense',
      status: 'active',
      verificationStatus: 'pending',
    };

    const res1 = await POST({ json: async () => payload } as any);
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.status).toBe('synced');

    // Duplicate submission
    const res2 = await POST({ json: async () => payload } as any);
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.message).toContain('Idempotent hit');
    expect(data2.id).toBe(data1.id);
  });

  it('5. Field Parity on Edits: Modifying non-amount fields is saved and not falsely skipped', async () => {
    const testUuid = 'edge-edit-test-' + Date.now();
    const baseExpense = {
      clientUuid: testUuid,
      amountPaise: 300000,
      currency: 'INR',
      description: 'बालू ट्रॉली',
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

    await POST({ json: async () => baseExpense } as any);

    // Edit description, paymentMethod, and vendor
    const updatedPayload = {
      ...baseExpense,
      description: 'बालू ट्रॉली (२ ट्रॉली)',
      vendorName: 'गुप्ता सप्लायर्स',
      paymentMethod: 'upi',
      notes: 'साइट पर अनलोड हो गई',
    };

    const resEdit = await POST({ json: async () => updatedPayload } as any);
    expect(resEdit.status).toBe(200);
    const dataEdit = await resEdit.json();
    expect(dataEdit.message).not.toContain('Idempotent hit');

    // Verify GET returns updated data
    const resGet = await GET();
    const list = await resGet.json();
    const found = list.records.find((r: any) => (r.clientUuid || r.client_uuid) === testUuid);
    expect(found).toBeDefined();
    expect(found.description).toBe('बालू ट्रॉली (२ ट्रॉली)');
    expect(found.paymentMethod || found.payment_method).toBe('upi');
  });

  it('6. Payer Reassignment: Changing payer updates successfully', async () => {
    const testUuid = 'edge-payer-test-' + Date.now();
    const expense = {
      clientUuid: testUuid,
      amountPaise: 200000,
      currency: 'INR',
      description: 'डीजल जनरेटर',
      categoryId: 'cat-transport',
      phaseId: 'phase-construction',
      paymentMethod: 'cash',
      paymentDate: '2026-11-15',
      paidByUserId: '11111111-1111-1111-1111-111111111111',
      paidByName: 'कृष्ण मुरारी तिवारी',
      submittedByUserId: '11111111-1111-1111-1111-111111111111',
      submittedByName: 'कृष्ण मुरारी तिवारी',
      deviceCreatedAt: new Date().toISOString(),
    };

    await POST({ json: async () => expense } as any);

    // Reassign payer to Manu
    const reassigned = {
      ...expense,
      paidByUserId: '22222222-2222-2222-2222-222222222222',
      paidByName: 'Manu Shukla',
    };

    const resPayer = await POST({ json: async () => reassigned } as any);
    expect(resPayer.status).toBe(200);
    const dataPayer = await resPayer.json();
    expect(dataPayer.message).not.toContain('Idempotent hit');
  });

  it('7. Tombstone Deletion: Offline voided expense is purged and excluded from queries', async () => {
    const testUuid = 'edge-tombstone-test-' + Date.now();
    await POST({
      json: async () => ({
        clientUuid: testUuid,
        amountPaise: 80000,
        currency: 'INR',
        description: 'गलत एंट्री',
        categoryId: 'cat-other-construction',
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

    // Send voided tombstone
    const resVoid = await POST({
      json: async () => ({
        clientUuid: testUuid,
        status: 'voided',
      }),
    } as any);
    expect(resVoid.status).toBe(200);

    // Verify it is excluded from GET
    const resGet = await GET();
    const list = await resGet.json();
    const found = list.records.find((r: any) => (r.clientUuid || r.client_uuid) === testUuid);
    expect(found).toBeUndefined();
  });

  it('8. DELETE Endpoint: Explicit DELETE removes record completely', async () => {
    const testUuid = 'edge-del-test-' + Date.now();
    await POST({
      json: async () => ({
        clientUuid: testUuid,
        amountPaise: 120000,
        currency: 'INR',
        description: 'डिलीट टेस्ट',
        categoryId: 'cat-other-construction',
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

    const resDel = await DELETE({
      url: `http://localhost:3000/api/sync/expenses?clientUuid=${testUuid}`,
    } as any);
    expect(resDel.status).toBe(200);

    const resGet = await GET();
    const list = await resGet.json();
    const found = list.records.find((r: any) => (r.clientUuid || r.client_uuid) === testUuid);
    expect(found).toBeUndefined();
  });

  it('9. Super Admin Security: Secret PIN 573776 is active', () => {
    expect(SUPER_ADMIN_SECRET_PIN).toBe('573776');
  });
});
