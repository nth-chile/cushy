import path from "node:path";
import fs from "node:fs";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { formatMoney, lineItemTotal, invoiceTotal } from "@/lib/invoice";

// Cushion's real font is Effra (commercial). These are free lookalikes; pick
// one with INVOICE_FONT. Falls back to Helvetica if the TTFs aren't found, so a
// missing file never 500s the PDF route.
const FONT_DIR = path.join(process.cwd(), "lib/pdf/fonts");
const FONT_CHOICE = process.env.INVOICE_FONT || "FiraSans";
let FONT = "Helvetica";
try {
  const regular = path.join(FONT_DIR, `${FONT_CHOICE}-Regular.ttf`);
  const bold = path.join(FONT_DIR, `${FONT_CHOICE}-Bold.ttf`);
  if (fs.existsSync(regular)) {
    Font.register({
      family: FONT_CHOICE,
      fonts: [
        { src: regular, fontWeight: 400 },
        { src: fs.existsSync(bold) ? bold : regular, fontWeight: 700 },
      ],
    });
    FONT = FONT_CHOICE;
  }
} catch {
  FONT = "Helvetica";
}

const INK = "#000000";
const MUTED = "#000000";

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingHorizontal: 56,
    paddingBottom: 56,
    fontSize: 10,
    fontFamily: FONT,
    color: INK,
    lineHeight: 1.4,
  },

  title: { fontSize: 34, fontWeight: 700, lineHeight: 1, marginBottom: 18 },

  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  number: { fontSize: 11, fontWeight: 700 },
  date: { fontSize: 11, color: MUTED },

  ruleThick: { borderBottomWidth: 2.5, borderBottomColor: INK, marginTop: 14 },

  parties: { flexDirection: "row", justifyContent: "space-between", marginTop: 22 },
  partyRight: { alignItems: "flex-end" },
  partyLabel: { fontSize: 10, fontWeight: 700, marginBottom: 5 },
  partyText: { fontSize: 10, fontWeight: 400, color: MUTED, marginBottom: 1 },

  ruleThin: { borderBottomWidth: 1, borderBottomColor: "#cfcfcf", marginTop: 22 },

  tableHead: { flexDirection: "row", marginTop: 20 },
  headText: { fontSize: 10, fontWeight: 700 },
  row: { flexDirection: "row", marginTop: 10 },
  cellDesc: { flex: 1, paddingRight: 8, fontWeight: 400 },
  cellQty: { width: 70, textAlign: "right", fontWeight: 400 },
  cellRate: { width: 80, textAlign: "right", fontWeight: 400 },
  cellTotal: { width: 80, textAlign: "right", fontWeight: 400 },
  tableBottom: { borderBottomWidth: 1, borderBottomColor: INK, marginTop: 12 },

  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 22 },
  totalLabel: { fontSize: 17, fontWeight: 700 },
  totalAmount: { fontSize: 17, fontWeight: 700 },

  footer: { position: "absolute", bottom: 28, left: 56, right: 56, textAlign: "center", fontSize: 9, color: INK },
});

export type InvoicePdfData = {
  number: number;
  issuedDate: string;
  business: {
    name?: string | null;
    email?: string | null;
  };
  client: {
    name: string;
    company?: string | null;
    email?: string | null;
  };
  lineItems: Array<{ description: string; quantity: string | number; unitPrice: string | number }>;
};

export function InvoicePDF({ data }: { data: InvoicePdfData }) {
  const total = invoiceTotal(data.lineItems);
  const clientName = data.client.company || data.client.name;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Invoice</Text>
        <View style={styles.metaRow}>
          <Text style={styles.number}>#{data.number}</Text>
          <Text style={styles.date}>{data.issuedDate}</Text>
        </View>
        <View style={styles.ruleThick} />

        <View style={styles.parties}>
          <View>
            <Text style={styles.partyLabel}>Prepared For</Text>
            <Text style={styles.partyText}>{clientName}</Text>
            {data.client.email && <Text style={styles.partyText}>{data.client.email}</Text>}
          </View>
          <View style={styles.partyRight}>
            <Text style={styles.partyLabel}>From</Text>
            {data.business.name && <Text style={styles.partyText}>{data.business.name}</Text>}
            {data.business.email && <Text style={styles.partyText}>{data.business.email}</Text>}
          </View>
        </View>
        <View style={styles.ruleThin} />

        <View style={styles.tableHead}>
          <Text style={[styles.cellDesc, styles.headText]}>Description</Text>
          <Text style={[styles.cellQty, styles.headText]}>Quantity</Text>
          <Text style={[styles.cellRate, styles.headText]}>Rate</Text>
          <Text style={[styles.cellTotal, styles.headText]}>Total</Text>
        </View>
        {data.lineItems.map((item, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.cellDesc}>{item.description}</Text>
            <Text style={styles.cellQty}>{Number(item.quantity)}</Text>
            <Text style={styles.cellRate}>{formatMoney(Number(item.unitPrice))}</Text>
            <Text style={styles.cellTotal}>{formatMoney(lineItemTotal(item))}</Text>
          </View>
        ))}
        <View style={styles.tableBottom} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Due</Text>
          <Text style={styles.totalAmount}>{formatMoney(total)}</Text>
        </View>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`}
        />
      </Page>
    </Document>
  );
}
