import Dexie, { Table } from 'dexie';
import { Expense, Category, ProjectPhase, Vendor, UserProfile } from '@/types';
import { DEFAULT_CATEGORIES, DEFAULT_PHASES, DEFAULT_PROFILES } from './constants';

export class SoulDiveDatabase extends Dexie {
  expenses!: Table<Expense, string>;
  categories!: Table<Category, string>;
  phases!: Table<ProjectPhase, string>;
  vendors!: Table<Vendor, string>;
  profiles!: Table<UserProfile, string>;

  constructor() {
    super('SoulDiveExpenseDB');
    this.version(1).stores({
      expenses: 'clientUuid, id, paymentDate, syncStatus, verificationStatus, submittedByUserId, categoryId, recordType',
      categories: 'id, groupName, isActive, sortOrder',
      phases: 'id, isActive, sortOrder',
      vendors: 'id, name',
      profiles: 'id, role, isActive',
    });

    this.version(2).stores({
      expenses: 'clientUuid, id, paymentDate, syncStatus, verificationStatus, submittedByUserId, categoryId, recordType, status',
    });
  }
}

export const db = new SoulDiveDatabase();

/**
 * Initializes default master data in IndexedDB on first launch so the app
 * is 100% operational offline without any network call.
 */
export async function initializeLocalDatabase(): Promise<void> {
  try {
    const categoriesCount = await db.categories.count();
    if (categoriesCount === 0) {
      await db.categories.bulkAdd(DEFAULT_CATEGORIES);
    }

    const phasesCount = await db.phases.count();
    if (phasesCount === 0) {
      await db.phases.bulkAdd(DEFAULT_PHASES);
    }

    // Keep profiles up-to-date with current defaults
    await db.profiles.bulkPut(DEFAULT_PROFILES);

    // Purge any voided or deleted expenses from local IndexedDB safely using primary keys
    const voidedKeys = await db.expenses
      .filter((e) => e.status === 'voided')
      .primaryKeys();
    if (voidedKeys.length > 0) {
      await db.expenses.bulkDelete(voidedKeys);
    }

    // Sanitize any previously saved names in existing expenses
    await db.expenses.toCollection().modify((expense) => {
      let changed = false;
      if (expense.submittedByName && /\((पिताजी|Father|admin|owner|मालिक \/ Admin)\)/i.test(expense.submittedByName)) {
        expense.submittedByName = expense.submittedByName.replace(/\s*\((पिताजी|Father|admin|owner|मालिक \/ Admin)\)/gi, '').trim();
        changed = true;
      }
      if (expense.paidByName && /\((पिताजी|Father|admin|owner|मालिक \/ Admin)\)/i.test(expense.paidByName)) {
        expense.paidByName = expense.paidByName.replace(/\s*\((पिताजी|Father|admin|owner|मालिक \/ Admin)\)/gi, '').trim();
        changed = true;
      }
      if (expense.submittedByName === 'Parth Tiwari') {
        expense.submittedByName = 'Manu Shukla';
        changed = true;
      }
      if (expense.paidByName === 'Parth Tiwari') {
        expense.paidByName = 'Manu Shukla';
        changed = true;
      }
      if (expense.verifiedByName === 'Parth Tiwari') {
        expense.verifiedByName = 'Manu Shukla';
        changed = true;
      }
      return changed;
    });

    const vendorsCount = await db.vendors.count();
    if (vendorsCount === 0) {
      await db.vendors.bulkAdd([
        { id: 'v1', name: 'Sharma Traders (शर्मा जी - सीमेंट/सरिया)', phone: '+91 98222 11111', notes: 'सीमेंट, सरिया सप्लायर', createdAt: new Date().toISOString() },
        { id: 'v2', name: 'Patel Electricals (पटेल इलेक्ट्रिकल्स)', phone: '+91 98333 22222', notes: 'केबल व मोटर सामान', createdAt: new Date().toISOString() },
        { id: 'v3', name: 'Yadav Bricks (यादव भट्ठा)', phone: '+91 98444 33333', notes: 'ईंट सप्लायर', createdAt: new Date().toISOString() },
        { id: 'v4', name: 'Local Sanitary & Hardware', phone: '+91 98555 44444', notes: 'पाइप व फिटिंग', createdAt: new Date().toISOString() },
      ]);
    }
  } catch (error) {
    console.error('Failed to initialize local Dexie database:', error);
  }
}

