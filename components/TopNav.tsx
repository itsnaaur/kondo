import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export function TopNav() {
  return (
    <header className="flex flex-shrink-0 items-center justify-between border-b border-neutral-800 px-6 py-4">
      <Link href="/">
        <Image src="/kondo-logo.png" alt="Kondo" width={276} height={45} className="h-4 w-auto" priority />
      </Link>
      <LogoutButton />
    </header>
  );
}
