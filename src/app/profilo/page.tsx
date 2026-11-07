import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/db";
import { getProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";
import { ProfileForm } from "./profile-form";
import { PAGE_SMALL, pageTitleClass } from "@/components/page";

export const metadata: Metadata = { title: "Profilo" };

export default function ProfilePage() {
  return (
    <main className={PAGE_SMALL}>
      <h1 className={pageTitleClass}>Profilo</h1>
      <Suspense fallback={<p>Caricamento…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const me = await requireUser();
  const profile = (await getProfile(db, me.id))!;
  return (
    <>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {profile.email}. Il nickname non compare mai accanto ai tuoi dati:
        in pubblico escono solo aggregati.
      </p>
      <ProfileForm profile={profile} />
      <Link href="/cambia-password" className="text-sm underline">
        Cambia password
      </Link>
    </>
  );
}
