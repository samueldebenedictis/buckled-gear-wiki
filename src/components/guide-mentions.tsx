export type Mention = { slug: string; title: string; award: string | null; badges: string[]; noteMd: string };

export function Badges({ badges }: { badges: string[] }) {
  if (!badges.length) return null;
  return (
    <ul className="flex flex-wrap gap-1">
      {badges.map((b) => (
        <li key={b} className="border border-black bg-white px-2 py-0.5 text-[11px] font-semibold lowercase">
          {b}
        </li>
      ))}
    </ul>
  );
}

export function Award({ award }: { award: string | null }) {
  if (!award) return null;
  return (
    <span className="inline-flex items-center gap-1.5 bg-buckled-yellow px-2 py-0.5 font-display text-[11px] font-black text-buckled-green uppercase">
      {/* Trofeo Font Awesome, come nella guida door-to-trail di buckled.it. */}
      <svg viewBox="0 0 576 512" className="size-3 shrink-0" fill="currentColor" aria-label="Premio" role="img">
        <path d="M552 64H448V24c0-13.3-10.7-24-24-24H152c-13.3 0-24 10.7-24 24v40H24C10.7 64 0 74.7 0 88v56c0 35.7 22.5 72.4 61.9 100.7 31.5 22.7 69.8 37.1 110 41.7C203.3 338.5 240 360 240 360v72h-48c-35.3 0-64 20.7-64 56v12c0 6.6 5.4 12 12 12h296c6.6 0 12-5.4 12-12v-12c0-35.3-28.7-56-64-56h-48v-72s36.7-21.5 68.1-73.6c40.3-4.6 78.6-19 110-41.7 39.3-28.3 61.9-65 61.9-100.7V88c0-13.3-10.7-24-24-24zM99.3 192.8C74.9 175.2 64 155.6 64 144v-16h64.2c1 32.6 5.8 61.2 12.8 86.2-15.1-5.2-29.2-12.4-41.7-21.4zM512 144c0 16.1-17.7 36.1-35.3 48.8-12.5 9-26.7 16.2-41.8 21.4 7-25 11.8-53.6 12.8-86.2H512v16z" />
      </svg>
      {award}
    </span>
  );
}

export const markdownClass = "flex flex-col gap-2 leading-relaxed [&_a]:underline [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc";
