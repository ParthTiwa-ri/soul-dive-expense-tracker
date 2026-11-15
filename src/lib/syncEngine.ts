import { db } from './db';
import { Expense } from '@/types';
import { supabase } from './supabase';
import { DEFAULT_CATEGORIES } from './constants';

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

// Local cross-tab broadcast channel (standard HTML5 Web API for sub-10ms same-origin tab sync)
const localTabBroadcast =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('souldive_tab_sync')
    : null;

/**
 * Broadcasts an expense modification event over both local BroadcastChannel (cross-tab)
 * and Supabase Realtime (cross-device) to instantly update all open screens without refresh.
 */
export function broadcastExpenseChange() {
  if (typeof window !== 'undefined') {
    // 1. Same-device cross-tab sync (< 10ms)
    try {
      localTabBroadcast?.postMessage({ type: 'expense_updated', timestamp: Date.now() });
    } catch (e) {}

    // 2. Cross-device cloud sync via Supabase (< 80ms)
    if (supabase) {
      try {
        const channel = supabase.channel('expenses_live_shared');
        channel.send({
          type: 'broadcast',
          event: 'expense_updated',
          payload: { timestamp: Date.now() },
        });
      } catch (e) {}
    }
  }
}

/**
 * Broadcasts an expense deletion event over local BroadcastChannel and Supabase Realtime
 * so all other connected phones/laptops immediately remove the record.
 */
export function broadcastExpenseDelete(clientUuid: string) {
  if (typeof window !== 'undefined') {
    // 1. Same-device cross-tab sync (< 10ms)
    try {
      localTabBroadcast?.postMessage({ type: 'expense_deleted', clientUuid, timestamp: Date.now() });
    } catch (e) {}

    // 2. Cross-device cloud sync via Supabase (< 80ms)
    if (supabase) {
      try {
        const channel = supabase.channel('expenses_live_shared');
        channel.send({
          type: 'broadcast',
          event: 'expense_deleted',
          payload: { clientUuid, timestamp: Date.now() },
        });
      } catch (e) {}
    }
  }
}

/**
 * Deletes an expense from the remote server / Supabase
 */
export async function deleteRemoteExpense(clientUuid: string): Promise<boolean> {
  // Broadcast deletion immediately to other devices (< 50ms)
  broadcastExpenseDelete(clientUuid);

  if (typeof window === 'undefined' || !navigator.onLine) {
    return false;
  }
  try {
    const res = await fetch(`/api/sync/expenses?clientUuid=${encodeURIComponent(clientUuid)}`, {
      method: 'DELETE',
    });
    broadcastExpenseChange();
    return res.ok;
  } catch (err) {
    console.warn('Failed to delete remote expense:', err);
    return false;
  }
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
    if (!Array.isArray(remoteRecords)) return 0;

    let pulledCount = 0;
    const remoteClientUuids = new Set(
      remoteRecords.map((r: any) => r.clientUuid || r.client_uuid).filter(Boolean)
    );

    // 1. Process inserts & updates from remote
    for (const r of remoteRecords) {
      const clientUuid = r.clientUuid || r.client_uuid;
      if (!clientUuid) continue;

      const remoteStatus = r.status;
      if (remoteStatus === 'voided') {
        // If deleted/voided on remote, remove locally as well
        await db.expenses.delete(clientUuid);
        continue;
      }

      const existing = await db.expenses.get(clientUuid);

      const defaultCat = DEFAULT_CATEGORIES.find(c => c.id === (r.categoryId || r.category_id));
      const categoryNameHi = r.categoryNameHi || r.category_name_hi || defaultCat?.nameHi || 'अन्य निर्माण खर्च';
      const categoryNameEn = r.categoryName || r.category_name || defaultCat?.nameEn || 'Other Construction Expenses';

      // If record does not exist locally (e.g. logged on the other person's phone)
      if (!existing) {
        const newExpense: Expense = {
          id: r.id,
          clientUuid,
          amountPaise: Number(r.amountPaise || r.amount_paise),
          currency: r.currency || 'INR',
          description: r.description || '',
          categoryId: r.categoryId || r.category_id || defaultCat?.id || 'cat-other-construction',
          categoryName: categoryNameEn,
          categoryNameHi: categoryNameHi,
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
        const remoteAmount = Number(r.amountPaise || r.amount_paise);
        const remoteDesc = r.description || '';
        const remoteStatus = r.verificationStatus || r.verification_status;
        const remoteRecordStatus = r.status || 'active';
        const remoteCatId = r.categoryId || r.category_id;
        const remoteVendor = r.vendorName !== undefined ? r.vendorName : r.vendor_name;
        const remotePaymentMethod = r.paymentMethod || r.payment_method;
        const remotePaymentDate = r.paymentDate || r.payment_date;
        const remoteHasReceipt = r.hasReceipt !== undefined ? Boolean(r.hasReceipt) : (r.has_receipt !== undefined ? Boolean(r.has_receipt) : undefined);
        const remoteReceiptUrl = r.receiptDataUrl !== undefined ? r.receiptDataUrl : r.receipt_data_url;

        // Check if remote has updates across ANY field
        const hasChanged =
          (remoteAmount > 0 && remoteAmount !== existing.amountPaise) ||
          (remoteDesc && remoteDesc !== existing.description) ||
          (remoteStatus && remoteStatus !== existing.verificationStatus) ||
          (remoteRecordStatus && remoteRecordStatus !== existing.status) ||
          (remoteCatId && remoteCatId !== existing.categoryId) ||
          (remoteVendor !== undefined && remoteVendor !== existing.vendorName) ||
          (remotePaymentMethod && remotePaymentMethod !== existing.paymentMethod) ||
          (remotePaymentDate && remotePaymentDate !== existing.paymentDate) ||
          (remoteHasReceipt !== undefined && remoteHasReceipt !== existing.hasReceipt) ||
          (remoteReceiptUrl !== undefined && remoteReceiptUrl !== existing.receiptDataUrl) ||
          (r.notes !== undefined && r.notes !== existing.notes);

        if (hasChanged) {
          await db.expenses.update(clientUuid, {
            amountPaise: remoteAmount > 0 ? remoteAmount : existing.amountPaise,
            description: remoteDesc || existing.description,
            categoryId: remoteCatId || existing.categoryId,
            categoryName: categoryNameEn,
            categoryNameHi: categoryNameHi,
            vendorId: r.vendorId || r.vendor_id || existing.vendorId,
            vendorName: remoteVendor !== undefined ? remoteVendor : existing.vendorName,
            phaseId: r.phaseId || r.phase_id || existing.phaseId,
            phaseName: r.phaseName || r.phase_name || existing.phaseName,
            paymentMethod: remotePaymentMethod || existing.paymentMethod,
            paymentDate: remotePaymentDate || existing.paymentDate,
            paymentTime: r.paymentTime || r.payment_time || existing.paymentTime,
            notes: r.notes !== undefined ? r.notes : existing.notes,
            status: remoteRecordStatus,
            verificationStatus: remoteStatus || existing.verificationStatus,
            verifiedByUserId: r.verifiedByUserId || r.verified_by_user_id || existing.verifiedByUserId,
            verifiedByName: r.verifiedByName || r.verified_by_name || existing.verifiedByName,
            verifiedAt: r.verifiedAt || r.verified_at || existing.verifiedAt,
            hasReceipt: remoteHasReceipt !== undefined ? remoteHasReceipt : existing.hasReceipt,
            receiptDataUrl: remoteReceiptUrl !== undefined ? remoteReceiptUrl : existing.receiptDataUrl,
          });
          pulledCount++;
        }
      }
    }

    // 2. Reconcile Deletions:
    // Any local expense marked 'synced' that is no longer returned by the cloud
    // was deleted by another device! Remove it from local IndexedDB.
    const localSyncedExpenses = await db.expenses
      .filter((e) => e.syncStatus === 'synced')
      .toArray();

    for (const localExp of localSyncedExpenses) {
      if (!remoteClientUuids.has(localExp.clientUuid)) {
        await db.expenses.delete(localExp.clientUuid);
        pulledCount++;
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
        categoryNameHi: record.categoryNameHi,
        vendorId: record.vendorId,
        vendorName: record.vendorName,
        phaseId: record.phaseId,
        phaseName: record.phaseName,
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
        verificationStatus: record.verificationStatus,
        verifiedByUserId: record.verifiedByUserId,
        verifiedByName: record.verifiedByName,
        verifiedAt: record.verifiedAt,
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

      if (record.status === 'voided') {
        // Once server acknowledges deletion/void, remove completely from local Dexie database
        await db.expenses.delete(record.clientUuid);
        broadcastExpenseDelete(record.clientUuid);
      } else {
        // Only mark synced after explicit server confirmation
        await db.expenses.update(record.clientUuid, {
          id: result.id || record.clientUuid,
          syncStatus: 'synced',
          serverCreatedAt: result.serverCreatedAt || new Date().toISOString(),
          syncError: undefined,
        });
      }

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

  if (syncedCount > 0) {
    broadcastExpenseChange();
  }

  return { syncedCount, failedCount, pulledCount };
}

/**
 * Applies a live Supabase Realtime broadcast event directly to local Dexie IndexedDB
 * giving instant, sub-second multi-device UI updates without page refreshes.
 */
export async function applyRemoteRealtimeEvent(
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  row: any
): Promise<void> {
  if (!row) return;
  const clientUuid = row.client_uuid || row.clientUuid;
  if (!clientUuid) return;

  if (eventType === 'DELETE' || row.status === 'voided') {
    await db.expenses.delete(clientUuid);
    return;
  }

  const existing = await db.expenses.get(clientUuid);

  if (!existing) {
    const newExpense: Expense = {
      id: row.id,
      clientUuid,
      amountPaise: Number(row.amount_paise || row.amountPaise),
      currency: row.currency || 'INR',
      description: row.description || '',
      categoryId: row.category_id || row.categoryId || 'cat-other-construction',
      categoryName: row.category_name || row.categoryName,
      categoryNameHi: row.category_name_hi || row.categoryNameHi,
      vendorId: row.vendor_id || row.vendorId,
      vendorName: row.vendor_name || row.vendorName,
      phaseId: row.phase_id || row.phaseId || 'phase-construction',
      phaseName: row.phase_name || row.phaseName,
      paymentMethod: row.payment_method || row.paymentMethod || 'cash',
      paymentDate: row.payment_date || row.paymentDate || new Date().toISOString().split('T')[0],
      paymentTime: row.payment_time || row.paymentTime,
      paidByUserId: row.paid_by_user_id || row.paidByUserId,
      paidByName: row.paid_by_name || row.paidByName || 'कृष्ण मुरारी तिवारी',
      submittedByUserId: row.submitted_by_user_id || row.submittedByUserId,
      submittedByName: row.submitted_by_name || row.submittedByName || 'कृष्ण मुरारी तिवारी',
      notes: row.notes,
      recordType: row.record_type || row.recordType || 'expense',
      status: row.status || 'active',
      verificationStatus: row.verification_status || row.verificationStatus || 'pending',
      verifiedByUserId: row.verified_by_user_id || row.verifiedByUserId,
      verifiedByName: row.verified_by_name || row.verifiedByName,
      verifiedAt: row.verified_at || row.verifiedAt,
      deviceCreatedAt: row.device_created_at || row.deviceCreatedAt || new Date().toISOString(),
      serverCreatedAt: row.created_at || row.serverCreatedAt,
      syncStatus: 'synced',
      hasReceipt: Boolean(row.has_receipt || row.hasReceipt),
      receiptDataUrl: row.receipt_data_url || row.receiptDataUrl,
    };
    await db.expenses.put(newExpense);
  } else {
    // Only update if existing is already synced to prevent overwriting pending local offline changes
    if (existing.syncStatus === 'synced') {
      await db.expenses.update(clientUuid, {
        amountPaise: Number(row.amount_paise || row.amountPaise) || existing.amountPaise,
        description: row.description || existing.description,
        categoryId: row.category_id || row.categoryId || existing.categoryId,
        categoryName: row.category_name || row.categoryName || existing.categoryName,
        categoryNameHi: row.category_name_hi || row.categoryNameHi || existing.categoryNameHi,
        vendorId: row.vendor_id || row.vendorId || existing.vendorId,
        vendorName: row.vendor_name || row.vendorName || existing.vendorName,
        phaseId: row.phase_id || row.phaseId || existing.phaseId,
        phaseName: row.phase_name || row.phaseName || existing.phaseName,
        paymentMethod: row.payment_method || row.paymentMethod || existing.paymentMethod,
        paymentDate: row.payment_date || row.paymentDate || existing.paymentDate,
        paymentTime: row.payment_time || row.paymentTime || existing.paymentTime,
        notes: row.notes !== undefined ? row.notes : existing.notes,
        status: row.status || existing.status,
        verificationStatus: row.verification_status || row.verificationStatus || existing.verificationStatus,
        verifiedByUserId: row.verified_by_user_id || row.verifiedByUserId || existing.verifiedByUserId,
        verifiedByName: row.verified_by_name || row.verifiedByName || existing.verifiedByName,
        verifiedAt: row.verified_at || row.verifiedAt || existing.verifiedAt,
        hasReceipt: row.has_receipt !== undefined ? Boolean(row.has_receipt) : existing.hasReceipt,
        receiptDataUrl: row.receipt_data_url || row.receiptDataUrl || existing.receiptDataUrl,
      });
    }
  }
}

