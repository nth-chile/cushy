"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, TextField } from "@heroui/react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push(next);
      router.refresh();
    } else {
      setError("Wrong password");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border border-default p-6">
        <h1 className="text-xl font-semibold">cushy</h1>
        <TextField value={password} onChange={setPassword} name="password" type="password" autoFocus>
          <Input placeholder="Password" />
        </TextField>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" variant="primary" isDisabled={loading} className="w-full">
          {loading ? "..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
