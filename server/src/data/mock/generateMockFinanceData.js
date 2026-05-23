import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  REFUND_STATUSES,
} from '../../models/entities.js';

const PLATFORMS = ['shopify', 'amazon', 'woocommerce', 'paypal', 'ebay'];
const PROCESSORS = ['paypal', 'shopify_payments', 'amazon_pay', 'braintree', 'adyen'];

function pad(n) {
  return String(n).padStart(4, '0');
}

/** Deterministic pseudo-random 0..1 from string key */
function hash01(key) {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (h << 5) - h + key.charCodeAt(i);
    h |= 0;
  }
  return (Math.abs(h) % 10000) / 10000;
}

/**
 * Builds realistic cross-linked orders, payments, refunds, and fees for dashboard testing.
 */
export function generateMockFinanceData() {
  const orders = [];
  const payments = [];
  const refunds = [];
  const fees = [];

  const customers = [
    'Northwind Trading',
    'Contoso LLC',
    'Fabrikam Inc.',
    'Adventure Works',
    'Litware',
    'Tailspin Toys',
    null,
  ];

  let feeCounter = 0;
  const addFee = (row) => {
    feeCounter += 1;
    fees.push({ ...row, source_system: 'mock', fee_id: `FEE-${pad(feeCounter)}` });
  };

  // ~90 days of activity
  for (let dayOffset = 0; dayOffset < 90; dayOffset += 1) {
    const baseDate = new Date();
    baseDate.setUTCDate(baseDate.getUTCDate() - dayOffset);
    const dayKey = baseDate.toISOString().slice(0, 10);

    const ordersThisDay = 3 + (dayOffset % 5);
    for (let i = 0; i < ordersThisDay; i += 1) {
      const platform = PLATFORMS[(dayOffset + i) % PLATFORMS.length];
      const orderNum = orders.length + 1;
      const order_id = `ORD-${platform.toUpperCase().slice(0, 3)}-${pad(orderNum)}`;
      const rnd = hash01(`${dayKey}-${order_id}`);

      const subtotal = Math.round(45 + rnd * 420);
      const tax = Math.round(subtotal * 0.08);
      const state_tax = Math.round(tax * 0.72);
      const county_tax = Math.max(0, tax - state_tax);
      const total_tax = tax;
      const shipping = rnd > 0.65 ? Math.round(8 + rnd * 12) : 0;
      const gross_amount = subtotal + tax + shipping;

      let order_status = ORDER_STATUSES.COMPLETED;
      if (rnd < 0.04) order_status = ORDER_STATUSES.CANCELLED;
      else if (rnd < 0.07) order_status = ORDER_STATUSES.PENDING;
      else if (rnd < 0.09) order_status = ORDER_STATUSES.PROCESSING;

      const customer_name = customers[Math.floor(rnd * customers.length)];

      orders.push({
        order_id,
        platform,
        source_system: 'mock',
        order_date: `${dayKey}T${String(12 + (i % 8)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00.000Z`,
        customer_name,
        gross_amount,
        tax_amount: tax,
        state_tax,
        county_tax,
        total_tax,
        shipping_amount: shipping,
        order_status,
      });

      if (
        order_status === ORDER_STATUSES.CANCELLED ||
        order_status === ORDER_STATUSES.PENDING
      ) {
        continue;
      }

      const processor = PROCESSORS[(i + dayOffset) % PROCESSORS.length];
      const payment_id = `PAY-${pad(payments.length + 1)}`;
      const payAmount = gross_amount;
      const procFee = Math.round(payAmount * (0.022 + rnd * 0.015));
      const payDate = new Date(orders[orders.length - 1].order_date);
      payDate.setMinutes(payDate.getMinutes() + 5);

      payments.push({
        payment_id,
        order_id,
        platform,
        source_system: 'mock',
        payment_processor: processor,
        payment_date: payDate.toISOString(),
        amount: payAmount,
        fee_amount: procFee,
        payment_status: PAYMENT_STATUSES.SUCCEEDED,
      });

      addFee({
        order_id,
        platform,
        fee_type: 'processor',
        fee_amount: procFee,
        fee_date: dayKey,
        source: 'payment_processor',
      });

      if (platform === 'amazon' || platform === 'shopify') {
        const platFee = Math.round(payAmount * 0.012);
        addFee({
          order_id,
          platform,
          fee_type: 'platform',
          fee_amount: platFee,
          fee_date: dayKey,
          source: 'marketplace',
        });
      }

      // Refunds: full, partial, or none
      const refundRoll = hash01(`ref-${order_id}`);
      if (order_status === ORDER_STATUSES.COMPLETED && refundRoll < 0.14) {
        const full = refundRoll < 0.06;
        const refundAmt = full
          ? payAmount
          : Math.round(payAmount * (0.25 + refundRoll * 0.45));
        const refund_id = `RFD-${pad(refunds.length + 1)}`;
        const rDate = new Date(payDate);
        rDate.setHours(rDate.getHours() + 12 + Math.floor(refundRoll * 30));

        refunds.push({
          refund_id,
          order_id,
          platform,
          source_system: 'mock',
          refund_date: rDate.toISOString(),
          refund_amount: refundAmt,
          refund_reason: full ? 'customer_request' : 'partial_quality_issue',
          refund_status: REFUND_STATUSES.SUCCEEDED,
        });

        orders[orders.length - 1].order_status = full
          ? ORDER_STATUSES.REFUNDED
          : ORDER_STATUSES.PARTIALLY_REFUNDED;

        addFee({
          order_id,
          platform,
          fee_type: 'currency_conversion',
          fee_amount: Math.round(refundAmt * 0.005),
          fee_date: rDate.toISOString().slice(0, 10),
          source: 'payment_processor',
        });
      }
    }
  }

  // Standalone subscription / chargeback style fees (no order)
  for (let k = 0; k < 8; k += 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - k * 11);
    const dk = d.toISOString().slice(0, 10);
    addFee({
      order_id: null,
      platform: PLATFORMS[k % PLATFORMS.length],
      fee_type: k % 2 === 0 ? 'subscription' : 'chargeback',
      fee_amount: k % 2 === 0 ? 29 : 1500,
      fee_date: dk,
      source: k % 2 === 0 ? 'marketplace' : 'payment_processor',
    });
  }

  return { orders, payments, refunds, fees };
}
