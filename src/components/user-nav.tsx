import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { db } from "@/db";
import { listPublishedGuides } from "@/lib/guides";
import { getCurrentUser } from "@/lib/session";
import { MenuColumn, menuItemClass } from "./header-menu";
import { SocialLinks } from "./social-links";

/** Contenuto del pannello del burger: account e, per i redattori, la redazione. */
export async function UserNav() {
  const user = await getCurrentUser();
  return (
    <nav aria-label="Menu" className="mx-auto flex max-w-[1140px] flex-wrap gap-x-[30px] gap-y-2.5 md:flex-nowrap">
      <MenuColumn title="La wiki">
        <Link href="/" className={menuItemClass}>
          Catalogo
        </Link>
        <Link href="/classifiche" className={menuItemClass}>
          Classifiche
        </Link>
      </MenuColumn>
      <GuidesColumn />
      <MenuColumn title={user ? user.name : "Account"}>
        {user ? (
          <>
            <Link href="/equipaggiamento" className={menuItemClass}>
              Equipaggiamento
            </Link>
            <Link href="/proposte" className={menuItemClass}>
              Proposte
            </Link>
            <Link href="/profilo" className={menuItemClass}>
              Profilo
            </Link>
            <form action={logout} className="flex">
              <button type="submit" className={menuItemClass}>
                Esci
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className={menuItemClass}>
            Accedi
          </Link>
        )}
      </MenuColumn>
      {user?.role === "redattore" && (
        <MenuColumn title="Redazione">
          <Link href="/redazione/catalogo" className={menuItemClass}>
            Catalogo
          </Link>
          <Link href="/redazione/proposte" className={menuItemClass}>
            Coda proposte
          </Link>
          <Link href="/redazione/guide" className={menuItemClass}>
            Guide
          </Link>
          <Link href="/redazione/utenti" className={menuItemClass}>
            Utenti
          </Link>
        </MenuColumn>
      )}
      {/* Come su buckled.it: colonne di pari larghezza, social in basso a destra. */}
      <div className="flex basis-full md:basis-auto md:flex-1 md:items-end md:justify-end">
        <SocialLinks />
      </div>
    </nav>
  );
}

/** Colonna "Guide": come su buckled.it, una voce per guida senza il prefisso "Guida". */
async function GuidesColumn() {
  "use cache";
  cacheTag("guides");
  cacheLife("hours");
  const list = await listPublishedGuides(db);
  if (!list.length) return null;
  return (
    <MenuColumn title="Guide">
      {list.map((g) => {
        const name = g.title.replace(/^guida\s+/i, "");
        return (
          <Link key={g.slug} href={`/guide/${g.slug}`} className={menuItemClass}>
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </Link>
        );
      })}
    </MenuColumn>
  );
}
