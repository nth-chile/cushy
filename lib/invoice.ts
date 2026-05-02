export type LineItem = {
  description: string;
  quantity: string | number;
  unitPrice: string | number;
};

export function lineItemTotal(item: LineItem): number {
  return Number(item.quantity) * Number(item.unitPrice);
}

export function invoiceTotal(items: LineItem[]): number {
  return items.reduce((sum, i) => sum + lineItemTotal(i), 0);
}

export function formatMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function renderTemplate(template: string, vars: Record<string, string | number | undefined | null>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });
}
