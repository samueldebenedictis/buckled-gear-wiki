import Link from "next/link";
import { PAGE_SMALL, pageTitleClass } from "@/components/page";

export default function Forbidden() {
  return (
    <main className={PAGE_SMALL}>
      <h1 className={pageTitleClass}>Accesso negato</h1>
      <p>Questa sezione è riservata alla redazione.</p>
      <Link href="/" className="underline">
        Torna alla home
      </Link>
    </main>
  );
}
