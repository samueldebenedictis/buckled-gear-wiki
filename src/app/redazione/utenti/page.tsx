import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader, adminRowClass, AdminTag, StatusTabs } from "@/components/admin-list";
import { inputClass } from "@/components/field";
import { PAGE_WIDE } from "@/components/page";
import { db } from "@/db";
import { listUsers } from "@/lib/admin-users";
import { isRole } from "@/lib/permissions";
import { requireRedattore } from "@/lib/session";
import { CreateUserForm } from "./create-user-form";
import { UserActions } from "./user-actions";

export const metadata: Metadata = { title: "Utenti · Redazione" };

type Props = PageProps<"/redazione/utenti">;

export default function UsersPage({ searchParams }: Props) {
  return (
    <main className={PAGE_WIDE}>
      <Suspense fallback={<p>Caricamento…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const dateFmt = new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" });

type User = Awaited<ReturnType<typeof listUsers>>[number];
const STATI = {
  redattori: { label: "Redattori", test: (u: User) => u.role === "redattore" },
  sospesi: { label: "Sospesi", test: (u: User) => !!u.banned },
  temporanea: { label: "Password temporanea", test: (u: User) => !!u.mustChangePassword },
} as const;
type Stato = keyof typeof STATI;

function href(f: { q?: string; stato?: Stato; nuovo?: boolean }) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.stato) p.set("stato", f.stato);
  if (f.nuovo) p.set("nuovo", "1");
  const qs = p.toString();
  return `/redazione/utenti${qs ? `?${qs}` : ""}`;
}

async function Content({ searchParams }: Pick<Props, "searchParams">) {
  const actor = await requireRedattore();
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 100) || undefined;
  const stato = typeof sp.stato === "string" && sp.stato in STATI ? (sp.stato as Stato) : undefined;
  const nuovo = sp.nuovo === "1";
  const all = await listUsers(db, q);
  const users = stato ? all.filter(STATI[stato].test) : all;

  return (
    <>
      <AdminHeader title="Utenti" newLabel="Nuovo utente" open={nuovo} openHref={href({ q, stato, nuovo: true })} closeHref={href({ q, stato })}>
        <CreateUserForm />
      </AdminHeader>

      {/* Stessa riga di ricerca del catalogo. */}
      <Form action="/redazione/utenti" scroll={false} role="search" className="flex flex-wrap gap-2">
        {stato && <input type="hidden" name="stato" value={stato} />}
        <input
          key={`q-${q ?? ""}`}
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Cerca per nickname o email"
          aria-label="Cerca utenti"
          className={`${inputClass} min-w-0 flex-[2_1_14rem]`}
        />
        <button
          type="submit"
          className="border border-buckled-yellow bg-buckled-yellow px-4 py-2 text-[13px] font-black tracking-wide text-black uppercase hover:bg-buckled-orange"
        >
          Cerca
        </button>
        {q && (
          <Link href={href({ stato })} scroll={false} className="self-center text-sm text-zinc-400 underline">
            togli la ricerca
          </Link>
        )}
      </Form>

      <StatusTabs
        tabs={[
          { label: "Tutti", count: all.length, href: href({ q }), active: !stato },
          ...(Object.keys(STATI) as Stato[]).map((s) => ({
            label: STATI[s].label,
            count: all.filter(STATI[s].test).length,
            href: href({ q, stato: s }),
            active: stato === s,
          })),
        ]}
      />

      {users.length ? (
        <ul className="flex flex-col pt-px">
          {users.map((u) => {
            const role = isRole(u.role) ? u.role : "utente";
            const isSelf = u.id === actor.id;
            return (
              <li
                key={u.id}
                className={`${adminRowClass} flex-wrap justify-between px-3 py-3`}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-display text-[13px] leading-tight font-semibold wrap-break-word uppercase">{u.name}</span>
                  <span className="text-sm break-all text-zinc-400">{u.email}</span>
                  <span className="flex flex-wrap gap-1">
                    {role === "redattore" && <AdminTag>redattore</AdminTag>}
                    {u.banned && <AdminTag tone="amber">sospeso</AdminTag>}
                    {u.mustChangePassword && <AdminTag tone="amber">password temporanea</AdminTag>}
                    {isSelf && <AdminTag>tu</AdminTag>}
                    <AdminTag>dal {dateFmt.format(u.createdAt)}</AdminTag>
                  </span>
                </div>
                {!isSelf && <UserActions user={{ ...u, role }} />}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-zinc-400">Nessun utente{q && ` per «${q}»`}.</p>
      )}
    </>
  );
}
