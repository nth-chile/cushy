import { redirect } from "next/navigation";
import { authDisabled, getSession } from "@/lib/auth";
import { Nav } from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!authDisabled) {
    const session = await getSession();
    if (!session.loggedIn) redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-default">
        <Nav />
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
