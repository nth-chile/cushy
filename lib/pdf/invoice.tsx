import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatMoney, lineItemTotal, invoiceTotal } from "@/lib/invoice";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#111" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  h1: { fontSize: 24, fontWeight: "bold", marginBottom: 4 },
  label: { color: "#666", fontSize: 9, textTransform: "uppercase", marginBottom: 2 },
  block: { marginBottom: 16 },
  row: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#eee" },
  rowHead: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#111", fontWeight: "bold" },
  cellDesc: { flex: 4, paddingRight: 8 },
  cellQty: { flex: 1, textAlign: "right" },
  cellPrice: { flex: 1, textAlign: "right" },
  cellTotal: { flex: 1, textAlign: "right" },
  totals: { marginTop: 12, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", width: 200, justifyContent: "space-between", paddingVertical: 4 },
  grandTotal: { fontWeight: "bold", borderTopWidth: 1, borderTopColor: "#111", paddingTop: 6 },
  notes: { marginTop: 32, color: "#444" },
});

export type InvoicePdfData = {
  number: number;
  issuedDate: string;
  dueDate?: string | null;
  notes?: string | null;
  business: {
    name?: string | null;
    address?: string | null;
    email?: string | null;
  };
  client: {
    name: string;
    company?: string | null;
    address?: string | null;
  };
  lineItems: Array<{ description: string; quantity: string | number; unitPrice: string | number }>;
};

export function InvoicePDF({ data }: { data: InvoicePdfData }) {
  const total = invoiceTotal(data.lineItems);
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.h1}>Invoice</Text>
            <Text>#{data.number}</Text>
          </View>
          <View>
            {data.business.name && <Text style={{ fontWeight: "bold" }}>{data.business.name}</Text>}
            {data.business.address && <Text>{data.business.address}</Text>}
            {data.business.email && <Text>{data.business.email}</Text>}
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 24 }}>
          <View style={styles.block}>
            <Text style={styles.label}>Bill to</Text>
            <Text style={{ fontWeight: "bold" }}>{data.client.name}</Text>
            {data.client.company && <Text>{data.client.company}</Text>}
            {data.client.address && <Text>{data.client.address}</Text>}
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>Issued</Text>
            <Text>{data.issuedDate}</Text>
            {data.dueDate && (
              <>
                <Text style={[styles.label, { marginTop: 6 }]}>Due</Text>
                <Text>{data.dueDate}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.rowHead}>
          <Text style={styles.cellDesc}>Description</Text>
          <Text style={styles.cellQty}>Qty</Text>
          <Text style={styles.cellPrice}>Price</Text>
          <Text style={styles.cellTotal}>Total</Text>
        </View>

        {data.lineItems.map((item, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.cellDesc}>{item.description}</Text>
            <Text style={styles.cellQty}>{Number(item.quantity)}</Text>
            <Text style={styles.cellPrice}>{formatMoney(Number(item.unitPrice))}</Text>
            <Text style={styles.cellTotal}>{formatMoney(lineItemTotal(item))}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>Total</Text>
            <Text>{formatMoney(total)}</Text>
          </View>
        </View>

        {data.notes && (
          <View style={styles.notes}>
            <Text>{data.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
