import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUserPendingPasswordChange } from "@/lib/session";
import { ChangePasswordForm } from "./change-password-form";
import { PAGE_SMALL, pageTitleClass } from "@/components/page";

export const metadata: Metadata = { title: "Cambia password" };

export default function ChangePasswordPage() {
  return (
    <main className={PAGE_SMALL}>
      <h1 className={pageTitleClass}>Cambia password</h1>
      <Suspense fallback={<p>Caricamento…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const user = await requireUserPendingPasswordChange();
  return (
    <>
      {user.mustChangePassword && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Stai usando una password temporanea. Scegline una nuova per continuare.
        </p>
      )}
      <ChangePasswordForm />
    </>
  );
}
