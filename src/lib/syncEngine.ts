import { db } from './db';
import { Expense } from '@/types';

export interface SyncStats {
  pendingCount: number;
  syncingCount: number;
  failedCount: number;
  lastSyncAt: string | null;
  isOnline: boolean;
}

/**
 * Compresses an image file client-side to max 1280px dimension and ~80% quality
 * to save mobile bandwidth while keeping bill text legible.
 */
export async function compressImage(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1280;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              reject(new Error('Failed to compress image blob'));
            }
          },
          'image/jpeg',
          0.82
        );
      };
      img.onerror = () => reject(new Error('Image decode error'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

/**
 * Pulls newly synchronized expenses from the server / Supabase into local Dexie IndexedDB
 * so both users (Father and Manu) can see each other's expenses in real time.
 */
export async function pullRemoteExpenses(): Promise<number> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return 0;
  }

  try {
    const response = await fetch('/api/sync/expenses');
    if (!response.ok) return 0;

    const data = await response.json();
    const remoteRecords = data.records || [];
    if (!Array.isArray(remoteRecords) || remoteRecords.length === 0) return 0;

    let pulledCount = 0;
    for (const r of remoteRecords) {
      const clientUuid = r.clientUuid || r.client_uuid;
      if (!clientUuid) continue;

      const existing = await db.expenses.get(clientUuid);

      // If record does not exist locally (e.g. logged on the other person's phone)
      if (!existing) {
        const newExpense: Expense = {
          id: r.id,
          clientUuid,
          amountPaise: Number(r.amountPaise || r.amount_paise),
          currency: r.currency || 'INR',
          description: r.description || '',
          categoryId: r.categoryId || r.category_id || 'cat-other-construction',
          categoryName: r.categoryName || r.category_name,
          categoryNameHi: r.categoryNameHi || r.category_name_hi,
          vendorId: r.vendorId || r.vendor_id,
          vendorName: r.vendorName || r.vendor_name,
          phaseId: r.phaseId || r.phase_id || 'phase-construction',
          phaseName: r.phaseName || r.phase_name,
          paymentMethod: r.paymentMethod || r.payment_method || 'cash',
          paymentDate: r.paymentDate || r.payment_date || new Date().toISOString().split('T')[0],
          paymentTime: r.paymentTime || r.payment_time,
          paidByUserId: r.paidByUserId || r.paid_by_user_id,
          paidByName: r.paidByName || r.paid_by_name || 'कृष्ण मुरारी तिवारी',
          submittedByUserId: r.submittedByUserId || r.submitted_by_user_id,
          submittedByName: r.submittedByName || r.submitted_by_name || 'कृष्ण मुरारी तिवारी',
          notes: r.notes,
          recordType: r.recordType || r.record_type || 'expense',
          status: r.status || 'active',
          verificationStatus: r.verificationStatus || r.verification_status || 'pending',
          verifiedByUserId: r.verifiedByUserId || r.verified_by_user_id,
          verifiedByName: r.verifiedByName || r.verified_by_name,
          verifiedAt: r.verifiedAt || r.verified_at,
          deviceCreatedAt: r.deviceCreatedAt || r.device_created_at || r.created_at || new Date().toISOString(),
          serverCreatedAt: r.serverCreatedAt || r.created_at,
          syncStatus: 'synced',
          hasReceipt: Boolean(r.hasReceipt || r.has_receipt),
          receiptDataUrl: r.receiptDataUrl || r.receipt_data_url,
        };

        await db.expenses.add(newExpense);
        pulledCount++;
      } else if (existing.syncStatus === 'synced') {
        // If the other user updated the verification status (e.g. Manu approved it)
        const remoteStatus = r.verificationStatus || r.verification_status;
        if (remoteStatus && remoteStatus !== existing.verificationStatus) {
          await db.expenses.update(clientUuid, {
            verificationStatus: remoteStatus,
            verifiedByUserId: r.verifiedByUserId || r.verified_by_user_id,
            verifiedByName: r.verifiedByName || r.verified_by_name,
            verifiedAt: r.verifiedAt || r.verified_at,
          });
        }
      }
    }

    return pulledCount;
  } catch (err) {
    console.warn('Failed to pull remote expenses:', err);
    return 0;
  }
}

/**
 * Triggers bidirectional synchronization:
 * 1. Pushes local offline expenses to the server
 * 2. Pulls new expenses added by the other device into local IndexedDB
 */
export async function syncPendingExpenses(): Promise<{ syncedCount: number; failedCount: number; pulledCount: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { syncedCount: 0, failedCount: 0, pulledCount: 0 };
  }

  // 1. Push Phase: Get all pending or failed expenses in creation order
  const pendingRecords = await db.expenses
    .filter((e) => e.syncStatus === 'pending' || e.syncStatus === 'failed')
    .sortBy('deviceCreatedAt');

  let syncedCount = 0;
  let failedCount = 0;

  for (const record of pendingRecords) {
    try {
      // Mark local record as syncing
      await db.expenses.update(record.clientUuid, {
        syncStatus: 'syncing',
        lastSyncAttemptAt: new Date().toISOString(),
      });

      // Prepare payload (excluding heavy local blob)
      const payload = {
        clientUuid: record.clientUuid,
        amountPaise: record.amountPaise,
        currency: record.currency,
        description: record.description,
        categoryId: record.categoryId,
        categoryName: record.categoryName,
        vendorId: record.vendorId,
        vendorName: record.vendorName,
        phaseId: record.phaseId,
        paymentMethod: record.paymentMethod,
        paymentDate: record.paymentDate,
        paymentTime: record.paymentTime,
        paidByUserId: record.paidByUserId,
        paidByName: record.paidByName,
        submittedByUserId: record.submittedByUserId,
        submittedByName: record.submittedByName,
        notes: record.notes,
        recordType: record.recordType,
        status: record.status,
        deviceCreatedAt: record.deviceCreatedAt,
        hasReceipt: record.hasReceipt,
        receiptDataUrl: record.receiptDataUrl, // base64 receipt
      };

      // Call our Next.js API sync endpoint
      const response = await fetch('/api/sync/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Sync server responded with status: ${response.status}`);
      }

      const result = await response.json();

      // Only mark synced after explicit server confirmation
      await db.expenses.update(record.clientUuid, {
        id: result.id || record.clientUuid,
        syncStatus: 'synced',
        serverCreatedAt: result.serverCreatedAt || new Date().toISOString(),
        syncError: undefined,
      });

      syncedCount++;
    } catch (err: any) {
      console.warn(`Sync failed for ${record.clientUuid}:`, err);
      await db.expenses.update(record.clientUuid, {
        syncStatus: 'failed',
        syncError: err?.message || 'Network / Server Error',
      });
      failedCount++;
    }
  }

  // 2. Pull Phase: Pull any expenses created on the other user's device
  const pulledCount = await pullRemoteExpenses();

  return { syncedCount, failedCount, pulledCount };
}

