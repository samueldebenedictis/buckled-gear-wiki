import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { setGuidePublishedAction } from "@/app/actions/redazione-guide";
import { AdminHeader, adminRowClass, AdminTag, Completeness, CompletenessLegend, StatusTabs } from "@/components/admin-list";
import { PublishToggle } from "@/components/publish-toggle";
import { db } from "@/db";
import { listGuidesAdmin } from "@/lib/guides";
import { requireRedattore } from "@/lib/session";
import { GuideForm } from "./guide-forms";
import { PAGE_WIDE } from "@/components/page";

export const metadata: Metadata = { title: "Guide · Redazione" };

type Props = PageProps<"/redazione/guide">;

export default function GuidesAdminPage({ searchParams }: Props) {
  return (
    <main className={PAGE_WIDE}>
      <Suspense fallback={<p>Caricamento…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const STATI = { pubblicate: "Pubblicate", bozze: "Bozze" } as const;
type Stato = keyof typeof STATI;
const CHECKS = ["introduzione", "the why", "prodotti", "pagina originale"];
const monthFmt = new Intl.DateTimeFormat("it-IT", { month: "short", year: "numeric", timeZone: "UTC" });

function href(f: { stato?: Stato; nuova?: boolean }) {
  const p = new URLSearchParams();
  if (f.stato) p.set("stato", f.stato);
  if (f.nuova) p.set("nuova", "1");
  const qs = p.toString();
  return `/redazione/guide${qs ? `?${qs}` : ""}`;
}

async function Content({ searchParams }: Pick<Props, "searchParams">) {
  await requireRedattore();
  const sp = await searchParams;
  const stato = sp.stato === "pubblicate" || sp.stato === "bozze" ? (sp.stato as Stato) : undefined;
  const nuova = sp.nuova === "1";
  const all = await listGuidesAdmin(db);
  const pick = (s: Stato) => all.filter((g) => g.published === (s === "pubblicate"));
  const list = stato ? pick(stato) : all;

  return (
    <>
      <AdminHeader
        title="Guide"
        newLabel="Nuova guida"
        open={nuova}
        openHref={href({ stato, nuova: true })}
        closeHref={href({ stato })}
      >
        <GuideForm />
      </AdminHeader>

      <StatusTabs
        tabs={[
          { label: "Tutte", count: all.length, href: href({}), active: !stato },
          ...(Object.keys(STATI) as Stato[]).map((s) => ({
            label: STATI[s],
            count: pick(s).length,
            href: href({ stato: s }),
            active: stato === s,
          })),
        ]}
      />
      <CompletenessLegend labels={CHECKS} />

      {list.length ? (
        <ul className="flex flex-col pt-px">
          {list.map((g) => (
            <li key={g.id} className={`${adminRowClass} px-3`}>
              <Link href={`/redazione/guide/${g.id}`} className="flex min-w-0 flex-1 flex-col gap-1 py-3 hover:underline">
                <span className="font-display text-[13px] leading-tight font-semibold wrap-break-word uppercase">{g.title}</span>
                <span className="flex flex-wrap gap-1">
                  <AdminTag>{g.items === 1 ? "1 prodotto" : `${g.items} prodotti`}</AdminTag>
                  {!g.published && <AdminTag tone="amber">bozza</AdminTag>}
                  {g.updatedOn && <AdminTag>aggiornata a {monthFmt.format(new Date(g.updatedOn))}</AdminTag>}
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-3 max-sm:flex-col max-sm:items-end max-sm:gap-2">
                <Completeness
                  checks={[
                    ["introduzione", g.hasIntro],
                    ["the why", g.hasWhy],
                    ["prodotti", g.items > 0],
                    ["pagina originale", g.hasSource],
                  ]}
                />
                <PublishToggle
                  action={setGuidePublishedAction}
                  fields={{ guideId: g.id, published: g.published ? "false" : "true" }}
                  published={g.published}
                  name={g.title}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-zinc-400">Nessuna guida.</p>
      )}
    </>
  );
}
