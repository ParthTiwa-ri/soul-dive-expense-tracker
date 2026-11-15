import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseConfigured } from '../../../../lib/supabase';

// In-memory fallback ledger for local development before Supabase keys are configured
interface StoredServerExpense {
  id: string;
  clientUuid: string;
  amountPaise: number;
  currency: string;
  description: string;
  categoryId: string;
  categoryName?: string;
  categoryNameHi?: string;
  vendorId?: string;
  vendorName?: string;
  phaseId: string;
  phaseName?: string;
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
  verifiedByUserId?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  deviceCreatedAt: string;
  serverCreatedAt: string;
  hasReceipt: boolean;
  receiptDataUrl?: string;
}

const localFallbackLedger: Map<string, StoredServerExpense> = new Map();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientUuid } = body;

    if (!clientUuid) {
      return NextResponse.json({ error: 'Missing clientUuid for idempotency' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // 1. If deleting / voiding an expense, remove from both Supabase and memory ledger
    if (body.status === 'voided') {
      if (supabase) {
        try {
          const { error: delError } = await supabase.from('expenses').delete().eq('client_uuid', clientUuid);
          if (delError) console.warn('Supabase delete error:', delError);
        } catch (err) {
          console.warn('Supabase delete failed:', err);
        }
      }
      localFallbackLedger.delete(clientUuid);
      return NextResponse.json({ clientUuid, status: 'deleted', message: 'Expense deleted/voided' });
    }

    if (!body.amountPaise || body.amountPaise <= 0) {
      return NextResponse.json({ error: 'amountPaise must be greater than zero' }, { status: 400 });
    }

    const expensePayload = {
      client_uuid: clientUuid,
      amount_paise: body.amountPaise,
      currency: body.currency || 'INR',
      description: body.description || '',
      category_id: body.categoryId,
      category_name: body.categoryName,
      category_name_hi: body.categoryNameHi,
      vendor_id: body.vendorId,
      vendor_name: body.vendorName,
      phase_id: body.phaseId,
      phase_name: body.phaseName,
      payment_method: body.paymentMethod || 'cash',
      payment_date: body.paymentDate || new Date().toISOString().split('T')[0],
      payment_time: body.paymentTime,
      paid_by_user_id: body.paidByUserId,
      paid_by_name: body.paidByName,
      submitted_by_user_id: body.submittedByUserId,
      submitted_by_name: body.submittedByName,
      notes: body.notes,
      record_type: body.recordType || 'expense',
      status: body.status || 'active',
      verification_status: body.verificationStatus || 'pending',
      verified_by_user_id: body.verifiedByUserId,
      verified_by_name: body.verifiedByName,
      verified_at: body.verifiedAt,
      device_created_at: body.deviceCreatedAt,
      has_receipt: Boolean(body.hasReceipt),
      receipt_data_url: body.receiptDataUrl,
      updated_at: new Date().toISOString(),
    };

    // 2. If Supabase is configured, write or update record in Supabase
    if (supabase) {
      try {
        const { data: existing } = await supabase
          .from('expenses')
          .select('*')
          .eq('client_uuid', clientUuid)
          .maybeSingle();

        if (existing) {
          // Check if literally anything changed (amount, description, category, payment method, date, vendor, notes, receipt, verification, payer)
          const isIdentical =
            Number(existing.amount_paise) === Number(body.amountPaise) &&
            (existing.description || '') === (body.description || '') &&
            (existing.verification_status || 'pending') === (body.verificationStatus || 'pending') &&
            (existing.status || 'active') === (body.status || 'active') &&
            (existing.payment_method || 'cash') === (body.paymentMethod || 'cash') &&
            (existing.payment_date || '') === (body.paymentDate || '') &&
            (existing.payment_time || '') === (body.paymentTime || '') &&
            (existing.category_id || '') === (body.categoryId || '') &&
            (existing.vendor_name || '') === (body.vendorName || '') &&
            (existing.paid_by_user_id || '') === (body.paidByUserId || '') &&
            (existing.notes || '') === (body.notes || '') &&
            Boolean(existing.has_receipt) === Boolean(body.hasReceipt) &&
            (existing.receipt_data_url || '') === (body.receiptDataUrl || '');

          if (isIdentical) {
            return NextResponse.json({
              id: existing.id,
              clientUuid: existing.client_uuid,
              serverCreatedAt: existing.created_at,
              message: 'Idempotent hit: Record already synchronized',
            });
          }

          // Update existing record in Supabase
          const { data: updated, error: updateError } = await supabase
            .from('expenses')
            .update(expensePayload)
            .eq('client_uuid', clientUuid)
            .select('id, client_uuid, created_at, updated_at')
            .single();

          if (updateError) {
            console.error('Supabase update error:', updateError);
            return NextResponse.json(
              { error: updateError.message, details: updateError },
              { status: 500 }
            );
          }

          if (updated) {
            return NextResponse.json({
              id: updated.id,
              clientUuid: updated.client_uuid,
              serverCreatedAt: updated.created_at,
              updatedAt: updated.updated_at,
              status: 'synced',
              message: 'Record updated successfully in Supabase',
            });
          }
        } else {
          // Insert new record into Supabase
          const { data: inserted, error: insertError } = await supabase
            .from('expenses')
            .insert(expensePayload)
            .select('id, client_uuid, created_at')
            .single();

          if (insertError) {
            console.error('Supabase insert error:', insertError);
            return NextResponse.json(
              { error: insertError.message, details: insertError },
              { status: 500 }
            );
          }

          if (inserted) {
            return NextResponse.json({
              id: inserted.id,
              clientUuid: inserted.client_uuid,
              serverCreatedAt: inserted.created_at,
              status: 'synced',
            });
          }
        }
      } catch (dbErr: any) {
        console.error('Supabase request failed:', dbErr);
        return NextResponse.json(
          { error: dbErr?.message || 'Database error' },
          { status: 500 }
        );
      }
    }

    // 3. Local In-Memory Fallback (when Supabase is not yet configured or offline)
    if (localFallbackLedger.has(clientUuid)) {
      const existing = localFallbackLedger.get(clientUuid)!;
      const isIdentical =
        existing.amountPaise === body.amountPaise &&
        (existing.description || '') === (body.description || '') &&
        (existing.verificationStatus || 'pending') === (body.verificationStatus || 'pending') &&
        (existing.status || 'active') === (body.status || 'active') &&
        (existing.paymentMethod || 'cash') === (body.paymentMethod || 'cash') &&
        (existing.paymentDate || '') === (body.paymentDate || '') &&
        (existing.categoryId || '') === (body.categoryId || '') &&
        (existing.vendorName || '') === (body.vendorName || '') &&
        (existing.notes || '') === (body.notes || '') &&
        Boolean(existing.hasReceipt) === Boolean(body.hasReceipt) &&
        (existing.receiptDataUrl || '') === (body.receiptDataUrl || '');

      if (isIdentical) {
        return NextResponse.json({
          id: existing.id,
          clientUuid: existing.clientUuid,
          serverCreatedAt: existing.serverCreatedAt,
          message: 'Idempotent hit: Record already synchronized',
        });
      }

      // Update existing record in fallback ledger
      const updatedRecord: StoredServerExpense = {
        ...existing,
        amountPaise: body.amountPaise,
        description: body.description || '',
        categoryId: body.categoryId,
        categoryName: body.categoryName,
        categoryNameHi: body.categoryNameHi,
        vendorId: body.vendorId,
        vendorName: body.vendorName,
        phaseId: body.phaseId,
        phaseName: body.phaseName,
        paymentMethod: body.paymentMethod || 'cash',
        paymentDate: body.paymentDate || existing.paymentDate,
        paymentTime: body.paymentTime,
        notes: body.notes,
        status: body.status || 'active',
        verificationStatus: body.verificationStatus || existing.verificationStatus,
        verifiedByUserId: body.verifiedByUserId || existing.verifiedByUserId,
        verifiedByName: body.verifiedByName || existing.verifiedByName,
        verifiedAt: body.verifiedAt || existing.verifiedAt,
        hasReceipt: Boolean(body.hasReceipt),
        receiptDataUrl: body.receiptDataUrl,
      };
      localFallbackLedger.set(clientUuid, updatedRecord);

      return NextResponse.json({
        id: existing.id,
        clientUuid: existing.clientUuid,
        serverCreatedAt: existing.serverCreatedAt,
        status: 'synced',
        message: 'Record updated in fallback ledger',
      });
    }

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
      categoryNameHi: body.categoryNameHi,
      vendorId: body.vendorId,
      vendorName: body.vendorName,
      phaseId: body.phaseId,
      phaseName: body.phaseName,
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
      verificationStatus: body.verificationStatus || 'pending',
      verifiedByUserId: body.verifiedByUserId,
      verifiedByName: body.verifiedByName,
      verifiedAt: body.verifiedAt,
      deviceCreatedAt: body.deviceCreatedAt,
      serverCreatedAt,
      hasReceipt: Boolean(body.hasReceipt),
      receiptDataUrl: body.receiptDataUrl,
    };

    localFallbackLedger.set(clientUuid, newExpense);

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
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data: records, error } = await supabase
        .from('expenses')
        .select('*')
        .neq('status', 'voided')
        .order('created_at', { ascending: false })
        .limit(5000);

      if (error) {
        console.error('Supabase fetch error in GET /api/sync/expenses:', error);
        return NextResponse.json(
          { error: error.message, totalCount: 0, records: [] },
          { status: 500 }
        );
      }

      return NextResponse.json({
        totalCount: records?.length || 0,
        records: records || [],
        source: 'supabase',
      });
    } catch (err: any) {
      console.error('Failed to fetch from Supabase:', err);
      return NextResponse.json(
        { error: err?.message || 'Database fetch error', totalCount: 0, records: [] },
        { status: 500 }
      );
    }
  }

  // Fallback to local memory ledger (strictly exclude voided/deleted)
  const records = Array.from(localFallbackLedger.values())
    .filter((e) => e.status !== 'voided')
    .sort((a, b) => new Date(b.serverCreatedAt).getTime() - new Date(a.serverCreatedAt).getTime());

  return NextResponse.json({
    totalCount: records.length,
    records,
    source: 'local_memory',
  });
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let clientUuid = searchParams.get('clientUuid');
    if (!clientUuid) {
      try {
        const body = await req.json();
        clientUuid = body.clientUuid;
      } catch {}
    }

    if (!clientUuid) {
      return NextResponse.json({ error: 'Missing clientUuid' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { error: delError } = await supabase.from('expenses').delete().eq('client_uuid', clientUuid);
        if (delError) {
          console.error('Supabase delete error:', delError);
          return NextResponse.json({ error: delError.message }, { status: 500 });
        }
      } catch (err: any) {
        console.error('Supabase delete failed:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    localFallbackLedger.delete(clientUuid);

    return NextResponse.json({
      success: true,
      clientUuid,
      message: 'Expense deleted successfully from server ledger',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
