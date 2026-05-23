function json(raw) {
  return JSON.stringify(raw ?? {});
}

export async function upsertOrder(client, row) {
  const sql = `
    INSERT INTO orders (
      source_system, source_id, order_id, platform, order_date, customer_name,
      gross_amount, tax_amount, state_tax, county_tax, total_tax, shipping_amount, order_status, raw_payload_json,
      external_reference, currency, linked_order_source_id, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5::timestamptz,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17,NOW()
    )
    ON CONFLICT (source_system, source_id) DO UPDATE SET
      order_id = EXCLUDED.order_id,
      platform = EXCLUDED.platform,
      order_date = EXCLUDED.order_date,
      customer_name = EXCLUDED.customer_name,
      gross_amount = EXCLUDED.gross_amount,
      tax_amount = EXCLUDED.tax_amount,
      state_tax = EXCLUDED.state_tax,
      county_tax = EXCLUDED.county_tax,
      total_tax = EXCLUDED.total_tax,
      shipping_amount = EXCLUDED.shipping_amount,
      order_status = EXCLUDED.order_status,
      raw_payload_json = EXCLUDED.raw_payload_json,
      external_reference = EXCLUDED.external_reference,
      currency = EXCLUDED.currency,
      linked_order_source_id = EXCLUDED.linked_order_source_id,
      updated_at = NOW()
  `;
  const existed = await client.query(
    `SELECT 1 FROM orders WHERE source_system = $1 AND source_id = $2`,
    [row.source_system, row.source_id],
  );
  await client.query(sql, [
    row.source_system,
    row.source_id,
    row.order_id,
    row.platform,
    row.order_date,
    row.customer_name,
    row.gross_amount,
    row.tax_amount,
    row.state_tax ?? 0,
    row.county_tax ?? 0,
    row.total_tax ?? 0,
    row.shipping_amount,
    row.order_status,
    json(row.raw_payload_json),
    row.external_reference,
    row.currency,
    row.linked_order_source_id ?? null,
  ]);
  return existed.rowCount > 0 ? 'updated' : 'inserted';
}

export async function upsertPayment(client, row) {
  const sql = `
    INSERT INTO payments (
      source_system, source_id, payment_id, order_id, platform, payment_processor,
      payment_date, amount, fee_amount, payment_status, raw_payload_json,
      external_reference, currency, linked_payment_source_id, linked_order_source_id,
      payout_source_id, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7::timestamptz,$8,$9,$10,$11::jsonb,$12,$13,$14,$15,$16,NOW()
    )
    ON CONFLICT (source_system, source_id) DO UPDATE SET
      payment_id = EXCLUDED.payment_id,
      order_id = EXCLUDED.order_id,
      platform = EXCLUDED.platform,
      payment_processor = EXCLUDED.payment_processor,
      payment_date = EXCLUDED.payment_date,
      amount = EXCLUDED.amount,
      fee_amount = EXCLUDED.fee_amount,
      payment_status = EXCLUDED.payment_status,
      raw_payload_json = EXCLUDED.raw_payload_json,
      external_reference = EXCLUDED.external_reference,
      currency = EXCLUDED.currency,
      linked_payment_source_id = EXCLUDED.linked_payment_source_id,
      linked_order_source_id = EXCLUDED.linked_order_source_id,
      payout_source_id = COALESCE(EXCLUDED.payout_source_id, payments.payout_source_id),
      updated_at = NOW()
  `;
  const existed = await client.query(
    `SELECT 1 FROM payments WHERE source_system = $1 AND source_id = $2`,
    [row.source_system, row.source_id],
  );
  await client.query(sql, [
    row.source_system,
    row.source_id,
    row.payment_id,
    row.order_id,
    row.platform,
    row.payment_processor,
    row.payment_date,
    row.amount,
    row.fee_amount,
    row.payment_status,
    json(row.raw_payload_json),
    row.external_reference,
    row.currency,
    row.linked_payment_source_id ?? null,
    row.linked_order_source_id ?? null,
    row.payout_source_id ?? null,
  ]);
  return existed.rowCount > 0 ? 'updated' : 'inserted';
}

export async function upsertRefund(client, row) {
  const sql = `
    INSERT INTO refunds (
      source_system, source_id, refund_id, order_id, platform, refund_date,
      refund_amount, refund_reason, refund_status, raw_payload_json,
      external_reference, currency, linked_payment_source_id, linked_order_source_id,
      payout_source_id, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6::timestamptz,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,NOW()
    )
    ON CONFLICT (source_system, source_id) DO UPDATE SET
      refund_id = EXCLUDED.refund_id,
      order_id = EXCLUDED.order_id,
      platform = EXCLUDED.platform,
      refund_date = EXCLUDED.refund_date,
      refund_amount = EXCLUDED.refund_amount,
      refund_reason = EXCLUDED.refund_reason,
      refund_status = EXCLUDED.refund_status,
      raw_payload_json = EXCLUDED.raw_payload_json,
      external_reference = EXCLUDED.external_reference,
      currency = EXCLUDED.currency,
      linked_payment_source_id = EXCLUDED.linked_payment_source_id,
      linked_order_source_id = EXCLUDED.linked_order_source_id,
      payout_source_id = COALESCE(EXCLUDED.payout_source_id, refunds.payout_source_id),
      updated_at = NOW()
  `;
  const existed = await client.query(
    `SELECT 1 FROM refunds WHERE source_system = $1 AND source_id = $2`,
    [row.source_system, row.source_id],
  );
  await client.query(sql, [
    row.source_system,
    row.source_id,
    row.refund_id,
    row.order_id,
    row.platform,
    row.refund_date,
    row.refund_amount,
    row.refund_reason,
    row.refund_status,
    json(row.raw_payload_json),
    row.external_reference,
    row.currency,
    row.linked_payment_source_id ?? null,
    row.linked_order_source_id ?? null,
    row.payout_source_id ?? null,
  ]);
  return existed.rowCount > 0 ? 'updated' : 'inserted';
}

export async function upsertFee(client, row) {
  const sql = `
    INSERT INTO fees (
      source_system, source_id, fee_id, order_id, platform, fee_type,
      fee_amount, fee_date, source, raw_payload_json,
      external_reference, currency, linked_payment_source_id, linked_order_source_id,
      payout_source_id, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8::date,$9,$10::jsonb,$11,$12,$13,$14,$15,NOW()
    )
    ON CONFLICT (source_system, source_id) DO UPDATE SET
      fee_id = EXCLUDED.fee_id,
      order_id = EXCLUDED.order_id,
      platform = EXCLUDED.platform,
      fee_type = EXCLUDED.fee_type,
      fee_amount = EXCLUDED.fee_amount,
      fee_date = EXCLUDED.fee_date,
      source = EXCLUDED.source,
      raw_payload_json = EXCLUDED.raw_payload_json,
      external_reference = EXCLUDED.external_reference,
      currency = EXCLUDED.currency,
      linked_payment_source_id = EXCLUDED.linked_payment_source_id,
      linked_order_source_id = EXCLUDED.linked_order_source_id,
      payout_source_id = COALESCE(EXCLUDED.payout_source_id, fees.payout_source_id),
      updated_at = NOW()
  `;
  const existed = await client.query(
    `SELECT 1 FROM fees WHERE source_system = $1 AND source_id = $2`,
    [row.source_system, row.source_id],
  );
  await client.query(sql, [
    row.source_system,
    row.source_id,
    row.fee_id,
    row.order_id,
    row.platform,
    row.fee_type,
    row.fee_amount,
    row.fee_date,
    row.source,
    json(row.raw_payload_json),
    row.external_reference,
    row.currency,
    row.linked_payment_source_id ?? null,
    row.linked_order_source_id ?? null,
    row.payout_source_id ?? null,
  ]);
  return existed.rowCount > 0 ? 'updated' : 'inserted';
}

export async function upsertPayout(client, row) {
  const sql = `
    INSERT INTO payouts (
      source_system, source_id, payout_id, platform, payout_date, arrival_date,
      amount, currency, payout_status, destination_last4, external_reference,
      raw_payload_json, linked_bank_transaction_id, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5::timestamptz,$6::timestamptz,$7,$8,$9,$10,$11,$12::jsonb,$13,NOW()
    )
    ON CONFLICT (source_system, source_id) DO UPDATE SET
      payout_id = EXCLUDED.payout_id,
      platform = EXCLUDED.platform,
      payout_date = EXCLUDED.payout_date,
      arrival_date = EXCLUDED.arrival_date,
      amount = EXCLUDED.amount,
      currency = EXCLUDED.currency,
      payout_status = EXCLUDED.payout_status,
      destination_last4 = EXCLUDED.destination_last4,
      external_reference = EXCLUDED.external_reference,
      raw_payload_json = EXCLUDED.raw_payload_json,
      linked_bank_transaction_id = COALESCE(EXCLUDED.linked_bank_transaction_id, payouts.linked_bank_transaction_id),
      updated_at = NOW()
    RETURNING id
  `;
  const { rows } = await client.query(sql, [
    row.source_system,
    row.source_id,
    row.payout_id,
    row.platform,
    row.payout_date,
    row.arrival_date ?? null,
    row.amount,
    row.currency,
    row.payout_status,
    row.destination_last4 ?? null,
    row.external_reference ?? null,
    json(row.raw_payload_json),
    row.linked_bank_transaction_id ?? null,
  ]);
  return rows[0].id;
}

export async function upsertPayoutItem(client, row) {
  const sql = `
    INSERT INTO payout_items (
      source_system, source_id, payout_record_id, item_type,
      linked_payment_source_id, linked_refund_source_id, linked_fee_source_id,
      amount, currency, event_date, external_reference, raw_payload_json, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::timestamptz,$11,$12::jsonb,NOW()
    )
    ON CONFLICT (source_system, source_id) DO UPDATE SET
      payout_record_id = EXCLUDED.payout_record_id,
      item_type = EXCLUDED.item_type,
      linked_payment_source_id = EXCLUDED.linked_payment_source_id,
      linked_refund_source_id = EXCLUDED.linked_refund_source_id,
      linked_fee_source_id = EXCLUDED.linked_fee_source_id,
      amount = EXCLUDED.amount,
      currency = EXCLUDED.currency,
      event_date = EXCLUDED.event_date,
      external_reference = EXCLUDED.external_reference,
      raw_payload_json = EXCLUDED.raw_payload_json,
      updated_at = NOW()
  `;
  await client.query(sql, [
    row.source_system,
    row.source_id,
    row.payout_record_id,
    row.item_type,
    row.linked_payment_source_id ?? null,
    row.linked_refund_source_id ?? null,
    row.linked_fee_source_id ?? null,
    row.amount,
    row.currency,
    row.event_date ?? null,
    row.external_reference ?? null,
    json(row.raw_payload_json),
  ]);
}

export async function upsertBankTransaction(client, row) {
  const existed = await client.query(
    `SELECT 1 FROM bank_transactions WHERE source_system = $1 AND source_id = $2`,
    [row.source_system, row.source_id],
  );
  const sql = `
    INSERT INTO bank_transactions (
      source_system, source_id, bank_account_name, bank_account_last4,
      transaction_date, posted_date, amount, currency, transaction_type,
      description, reference_number, external_reference, raw_payload_json,
      reconciliation_status, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5::date,$6::date,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,NOW()
    )
    ON CONFLICT (source_system, source_id) DO UPDATE SET
      bank_account_name = EXCLUDED.bank_account_name,
      bank_account_last4 = EXCLUDED.bank_account_last4,
      transaction_date = EXCLUDED.transaction_date,
      posted_date = EXCLUDED.posted_date,
      amount = EXCLUDED.amount,
      currency = EXCLUDED.currency,
      transaction_type = EXCLUDED.transaction_type,
      description = EXCLUDED.description,
      reference_number = EXCLUDED.reference_number,
      external_reference = EXCLUDED.external_reference,
      raw_payload_json = EXCLUDED.raw_payload_json,
      reconciliation_status = CASE
        WHEN bank_transactions.reconciliation_status IS DISTINCT FROM 'unmatched'
        THEN bank_transactions.reconciliation_status
        ELSE EXCLUDED.reconciliation_status
      END,
      updated_at = NOW()
  `;
  await client.query(sql, [
    row.source_system,
    row.source_id,
    row.bank_account_name ?? null,
    row.bank_account_last4 ?? null,
    row.transaction_date,
    row.posted_date ?? null,
    row.amount,
    row.currency,
    row.transaction_type,
    row.description ?? null,
    row.reference_number ?? null,
    row.external_reference ?? null,
    json(row.raw_payload_json),
    row.reconciliation_status ?? 'unmatched',
  ]);
  return existed.rowCount > 0 ? 'updated' : 'inserted';
}
