"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Key } from "@heroui/react";
import { ListBox, Select } from "@heroui/react";
import { todayISO } from "@/lib/time";

const STATUSES = [
  { id: "draft", label: "Draft" },
  { id: "sent", label: "Sent" },
  { id: "paid", label: "Paid" },
];

export function StatusDropdown({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState<Key | null>(status);
  const [saving, setSaving] = useState(false);

  async function onChange(next: Key | null) {
    if (!next || next === value) return;
    const prev = value;
    setValue(next);
    setSaving(true);
    const update =
      next === "paid"
        ? { status: "paid", paidDate: todayISO() }
        : { status: next, paidDate: null };
    const res = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    setSaving(false);
    if (res.ok) router.refresh();
    else setValue(prev);
  }

  return (
    <Select
      aria-label="Invoice status"
      value={value}
      onChange={onChange}
      isDisabled={saving}
      className="w-28"
    >
      <Select.Trigger className="border border-default bg-surface-secondary">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {STATUSES.map((s) => (
            <ListBox.Item key={s.id} id={s.id} textValue={s.label}>
              {s.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
