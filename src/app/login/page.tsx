import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { PAGE_SMALL, pageTitleClass } from "@/components/page";

export const metadata: Metadata = { title: "Accedi" };

export default function LoginPage() {
  return (
    <main className={PAGE_SMALL}>
      <h1 className={pageTitleClass}>Accedi</h1>
      <LoginForm />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Non c&apos;è registrazione: gli account li crea la redazione. Password dimenticata? Scrivi alla
        redazione.
      </p>
    </main>
  );
}
