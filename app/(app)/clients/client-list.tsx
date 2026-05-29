"use client";

import Link from "next/link";
import { Table } from "@heroui/react";

type ClientRow = {
  id: number;
  name: string;
  company: string | null;
  hourlyRate: string | null;
};

export function ClientList({ rows }: { rows: ClientRow[] }) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Clients">
          <Table.Header>
            <Table.Column isRowHeader>Name</Table.Column>
            <Table.Column>Company</Table.Column>
            <Table.Column className="text-right">Rate</Table.Column>
          </Table.Header>
          <Table.Body>
            {rows.map((c) => (
              <Table.Row key={c.id} className="relative">
                <Table.Cell className="font-medium">
                  <Link
                    href={`/clients/${c.id}`}
                    className="absolute inset-0"
                    aria-label={c.name}
                  />
                  {c.name}
                </Table.Cell>
                <Table.Cell className="text-muted">{c.company}</Table.Cell>
                <Table.Cell className="text-right text-muted">
                  {c.hourlyRate ? `$${c.hourlyRate}/hr` : null}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
