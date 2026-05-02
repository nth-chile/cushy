import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import NewInvoiceView from "./new-view";

export default async function NewInvoicePage() {
  const list = await db
    .select({ id: clients.id, name: clients.name, hourlyRate: clients.hourlyRate })
    .from(clients)
    .orderBy(clients.name);
  return <NewInvoiceView clients={list} />;
}
