import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import TimeView from "./time-view";

export default async function TimePage() {
  const clientList = await db.select({ id: clients.id, name: clients.name }).from(clients).orderBy(clients.name);
  return <TimeView clients={clientList} />;
}
