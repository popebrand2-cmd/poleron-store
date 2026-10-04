// "Envío gratis sobre $70.000 en la Región Metropolitana" is promised in the announcement bar, so the cart,
// the checkout page and the checkout API all read the rule from here — what the customer is told is what
// they are charged.
export const FREE_SHIPPING_MIN = 70000;
export const FREE_SHIPPING_REGION = "Región Metropolitana de Santiago";

// Delivery price for a comuna: free when the items reach the minimum and the comuna is in the Región
// Metropolitana; otherwise the comuna's own rate. Pickup is always free and never goes through here.
export function deliveryCost(itemsTotal: number, rate: { region: string; priceCLP: number }): number {
  return itemsTotal >= FREE_SHIPPING_MIN && rate.region === FREE_SHIPPING_REGION ? 0 : rate.priceCLP;
}
