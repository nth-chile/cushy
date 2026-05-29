"use client";

import { Button } from "@heroui/react";

// A state-driven confirmation modal. Use this instead of window.confirm():
// a synchronous window.confirm() inside a React Aria onPress handler fires the
// press twice (the blocking dialog interrupts the pointerup -> click sequence),
// so the user gets prompted twice.
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg bg-surface-secondary p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        {message && <p className="text-sm text-muted">{message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onPress={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onPress={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
