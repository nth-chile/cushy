import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import SettingsForm from "./settings-form";

export default async function SettingsPage() {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <SettingsForm initial={row ?? null} />
    </div>
  );
}
