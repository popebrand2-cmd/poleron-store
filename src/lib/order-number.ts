// Customer-facing order name: POPE01, POPE02 … (two digits at least, then POPE100, POPE101 …).
// Orders created before numbering existed fall back to the short internal id until the start-up
// script (scripts/order-numbers.js) numbers them.
export function formatOrderNumber(order: { id: string; number?: number | null }): string {
  return order.number && order.number > 0 ? `POPE${String(order.number).padStart(2, "0")}` : `#${order.id.slice(0, 8)}`;
}
