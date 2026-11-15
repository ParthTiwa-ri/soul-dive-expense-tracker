export type UserRole = 'owner' | 'manager' | 'contributor' | 'viewer';

export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'card' | 'cheque' | 'other';

export type ExpenseRecordType = 'expense' | 'advance' | 'refund' | 'reversal';

export type ExpenseStatus = 'active' | 'voided';

export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'needs_correction';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface UserProfile {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  role: UserRole;
  isActive: boolean;
  preferredLanguage: 'hi' | 'en';
}

export interface ProjectPhase {
  id: string;
  nameEn: string;
  nameHi: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Category {
  id: string;
  nameEn: string;
  nameHi: string;
  groupName: 'construction' | 'operations' | 'financial';
  parentId?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Vendor {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id?: string; // Server UUID once synced
  clientUuid: string; // Device-generated UUID for idempotency
  amountPaise: number; // BigInt represented as number in JS (1 INR = 100 paise)
  currency: 'INR';
  description: string;
  categoryId: string;
  categoryName?: string;
  categoryNameHi?: string;
  vendorId?: string;
  vendorName?: string;
  phaseId: string;
  phaseName?: string;
  paymentMethod: PaymentMethod;
  paymentDate: string; // YYYY-MM-DD
  paymentTime?: string; // HH:MM:SS
  paidByUserId: string;
  paidByName: string;
  submittedByUserId: string;
  submittedByName: string;
  notes?: string;
  recordType: ExpenseRecordType;
  status: ExpenseStatus;
  verificationStatus: VerificationStatus;
  verifiedByUserId?: string;
  verifiedAt?: string;
  deviceCreatedAt: string;
  serverCreatedAt?: string;
  syncStatus: SyncStatus;
  syncError?: string;
  lastSyncAttemptAt?: string;
  hasReceipt: boolean;
  receiptDataUrl?: string; // Offline cached thumbnail or preview
  receiptBlob?: Blob; // For offline upload
  receiptStoragePath?: string;
}

export interface ParsedVoiceResult {
  rawTranscript: string;
  amountPaise?: number;
  amountRupees?: number;
  description?: string;
  vendorName?: string;
  vendorId?: string;
  categoryName?: string;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
  paymentDate?: string;
  confidence: number;
  unrecognizedText?: string;
}

export interface CashSession {
  id: string;
  openingBalancePaise: number;
  closingBalancePaise?: number;
  openedByUserId: string;
  closedByUserId?: string;
  openedAt: string;
  closedAt?: string;
  notes?: string;
}

export interface ReconciliationRecord {
  id: string;
  reconciliationDate: string;
  paymentMethod: PaymentMethod;
  expectedTotalPaise: number;
  actualTotalPaise: number;
  differencePaise: number;
  performedByUserId: string;
  notes?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorUserId?: string;
  actorName?: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: Record<string, any>;
  afterData?: Record<string, any>;
  createdAt: string;
}

