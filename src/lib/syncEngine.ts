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
 * Triggers synchronization of all pending offline expenses
 */
export async function syncPendingExpenses(): Promise<{ syncedCount: number; failedCount: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { syncedCount: 0, failedCount: 0 };
  }

  // Get all pending or failed expenses in creation order
  const pendingRecords = await db.expenses
    .filter((e) => e.syncStatus === 'pending' || e.syncStatus === 'failed')
    .sortBy('deviceCreatedAt');

  if (pendingRecords.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

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

  return { syncedCount, failedCount };
}
