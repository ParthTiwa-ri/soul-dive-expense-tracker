import { NextRequest, NextResponse } from 'next/server';

// Server-side in-memory ledger fallback for local development & demonstration
// before production Supabase environment variables are provided by the owner.
interface StoredServerExpense {
  id: string;
  clientUuid: string;
  amountPaise: number;
  currency: string;
  description: string;
  categoryId: string;
  categoryName?: string;
  vendorId?: string;
  vendorName?: string;
  phaseId: string;
  paymentMethod: string;
  paymentDate: string;
  paymentTime?: string;
  paidByUserId: string;
  paidByName: string;
  submittedByUserId: string;
  submittedByName: string;
  notes?: string;
  recordType: string;
  status: string;
  verificationStatus: string;
  deviceCreatedAt: string;
  serverCreatedAt: string;
  hasReceipt: boolean;
  receiptDataUrl?: string;
}

// Global server cache for development
const serverLedger: Map<string, StoredServerExpense> = new Map();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientUuid } = body;

    if (!clientUuid) {
      return NextResponse.json({ error: 'Missing clientUuid for idempotency' }, { status: 400 });
    }

    if (!body.amountPaise || body.amountPaise <= 0) {
      return NextResponse.json({ error: 'amountPaise must be greater than zero' }, { status: 400 });
    }

    // 1. Idempotency Check: if this clientUuid has already been synced, return existing server record
    if (serverLedger.has(clientUuid)) {
      const existing = serverLedger.get(clientUuid)!;
      return NextResponse.json({
        id: existing.id,
        clientUuid: existing.clientUuid,
        serverCreatedAt: existing.serverCreatedAt,
        message: 'Idempotent hit: Record already synchronized',
      });
    }

    // 2. Record new transaction
    const serverId = `srv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const serverCreatedAt = new Date().toISOString();

    const newExpense: StoredServerExpense = {
      id: serverId,
      clientUuid,
      amountPaise: body.amountPaise,
      currency: body.currency || 'INR',
      description: body.description || '',
      categoryId: body.categoryId,
      categoryName: body.categoryName,
      vendorId: body.vendorId,
      vendorName: body.vendorName,
      phaseId: body.phaseId,
      paymentMethod: body.paymentMethod || 'cash',
      paymentDate: body.paymentDate || new Date().toISOString().split('T')[0],
      paymentTime: body.paymentTime,
      paidByUserId: body.paidByUserId,
      paidByName: body.paidByName,
      submittedByUserId: body.submittedByUserId,
      submittedByName: body.submittedByName,
      notes: body.notes,
      recordType: body.recordType || 'expense',
      status: body.status || 'active',
      verificationStatus: 'pending',
      deviceCreatedAt: body.deviceCreatedAt,
      serverCreatedAt,
      hasReceipt: Boolean(body.hasReceipt),
      receiptDataUrl: body.receiptDataUrl,
    };

    serverLedger.set(clientUuid, newExpense);

    return NextResponse.json({
      id: serverId,
      clientUuid,
      serverCreatedAt,
      status: 'synced',
    });
  } catch (err: any) {
    console.error('Error in /api/sync/expenses:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  const records = Array.from(serverLedger.values()).sort(
    (a, b) => new Date(b.serverCreatedAt).getTime() - new Date(a.serverCreatedAt).getTime()
  );
  return NextResponse.json({
    totalCount: records.length,
    records,
  });
}

