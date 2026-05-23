/**
 * Example adapter — map a Shopify Admin API order payload into NormalizedOrder.
 * Replace with real field mapping when integrating.
 *
 * @param {Record<string, unknown>} shopifyOrder
 */
export function toNormalizedOrderFromShopify(shopifyOrder) {
  const id = String(shopifyOrder.id ?? '');
  const created = shopifyOrder.created_at
    ? new Date(shopifyOrder.created_at).toISOString()
    : new Date().toISOString();

  return {
    order_id: `shopify_${id}`,
    platform: 'shopify',
    order_date: created,
    customer_name: shopifyOrder.customer?.first_name
      ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name ?? ''}`.trim()
      : null,
    gross_amount: Number(shopifyOrder.total_price ?? 0),
    tax_amount: Number(shopifyOrder.total_tax ?? 0),
    shipping_amount: Number(shopifyOrder.total_shipping ?? 0),
    order_status: String(shopifyOrder.financial_status ?? 'pending'),
  };
}
