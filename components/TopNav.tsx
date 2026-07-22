import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export function TopNav() {
  return (
    <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
      <Link href="/" className="text-lg font-semibold text-neutral-100">
        Kondo
      </Link>
      <LogoutButton />
    </header>
  );
}
