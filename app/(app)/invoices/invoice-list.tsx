"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Table } from "@heroui/react";
import { formatMoney } from "@/lib/invoice";
import { todayISO } from "@/lib/time";
import { StatusDropdown } from "./status-dropdown";

type InvoiceRow = {
  id: number;
  number: number;
  clientName: string | null;
  issuedDate: string | null;
  paidDate: string | null;
  status: string;
  total: string;
};

const INITIAL_COUNT = 10;

export function InvoiceList({ rows }: { rows: InvoiceRow[] }) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const visible = showAll ? rows : rows.slice(0, INITIAL_COUNT);
  const hidden = rows.length - visible.length;

  async function duplicate(id: number) {
    setDuplicatingId(id);
    const res = await fetch(`/api/invoices/${id}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issuedDate: todayISO() }),
    });
    setDuplicatingId(null);
    if (res.ok) {
      const created = await res.json();
      router.push(`/invoices/${created.id}`);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Invoices">
            <Table.Header>
              <Table.Column isRowHeader>#</Table.Column>
              <Table.Column>Client</Table.Column>
              <Table.Column>Issued</Table.Column>
              <Table.Column className="text-right">Total</Table.Column>
              <Table.Column className="text-right">Status</Table.Column>
              <Table.Column aria-label="Actions" />
            </Table.Header>
            <Table.Body>
              {visible.map((inv) => (
                <Table.Row key={inv.id} className="relative">
                  <Table.Cell className="font-mono">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="absolute inset-0"
                      aria-label={`Invoice #${inv.number}`}
                    />
                    #{inv.number}
                  </Table.Cell>
                  <Table.Cell>{inv.clientName}</Table.Cell>
                  <Table.Cell className="text-default-500">{inv.issuedDate}</Table.Cell>
                  <Table.Cell className="text-right">{formatMoney(Number(inv.total))}</Table.Cell>
                  <Table.Cell className="relative z-10">
                    <div className="flex justify-end">
                      <StatusDropdown id={inv.id} status={inv.paidDate ? "paid" : inv.status} />
                    </div>
                  </Table.Cell>
                  <Table.Cell className="relative z-10">
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        isDisabled={duplicatingId === inv.id}
                        onPress={() => duplicate(inv.id)}
                      >
                        {duplicatingId === inv.id ? "Duplicating…" : "Duplicate"}
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      {hidden > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onPress={() => setShowAll(true)}>
            Show all {rows.length} invoices ({hidden} more)
          </Button>
        </div>
      )}
    </div>
  );
}
