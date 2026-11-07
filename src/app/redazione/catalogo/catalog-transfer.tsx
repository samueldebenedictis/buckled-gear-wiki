"use client";

// Esporta e importa il catalogo come ZIP (catalogo.json + foto/). Lo ZIP lo
// compone e lo apre il browser: al server arrivano solo il JSON e poi le foto una
// alla volta, sotto il limite di dimensione delle richieste di Vercel.
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { useState, type ChangeEvent } from "react";
import { uploadImageAction } from "@/app/actions/redazione-catalogo";
import { exportCatalogAction, importCatalogAction } from "@/app/actions/redazione-transfer";
import type { ImportReport } from "@/lib/catalog-transfer";

const MIME_EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/avif": "avif" };
const btn = "border px-4 py-2 text-[13px] font-black tracking-wide uppercase disabled:opacity-40";

type Loaded = { name: string; json: string; photos: Record<string, Uint8Array> };

async function reachable(url: string) {
  try {
    return (await fetch(url, { method: "HEAD" })).ok;
  } catch {
    return false;
  }
}

export function CatalogTransfer() {
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<Loaded | null>(null);
  const [preview, setPreview] = useState<ImportReport | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function exportZip() {
    setError(null);
    setBusy("Preparo i dati…");
    try {
      const data = await exportCatalogAction();
      const files: Record<string, Uint8Array> = {};
      const withImage = data.products.filter((p) => p.image);
      let n = 0;
      let failed = 0;
      // Sei download alla volta.
      const queue = [...withImage];
      await Promise.all(
        Array.from({ length: 6 }, async () => {
          for (let p = queue.shift(); p; p = queue.shift()) {
            try {
              const res = await fetch(p.image!);
              if (!res.ok) throw new Error(String(res.status));
              const ext = MIME_EXT[res.headers.get("content-type")?.split(";")[0] ?? ""] ?? p.image!.split(".").pop()!.toLowerCase();
              const name = `foto/${p.slug}.${ext}`;
              files[name] = new Uint8Array(await res.arrayBuffer());
              p.imageFile = name;
            } catch {
              failed++; // resta il link originale
            }
            setBusy(`Scarico le foto… ${++n}/${withImage.length}`);
          }
        }),
      );
      files["catalogo.json"] = strToU8(JSON.stringify(data, null, 2));
      // Livello 0: le foto sono già compresse.
      const zip = zipSync(files, { level: 0 });
      const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: "application/zip" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `buckled-catalogo-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setDone(`Esportati ${data.products.length} prodotti${failed ? `; ${failed} foto non scaricate (resta il link)` : ""}.`);
    } catch (e) {
      setError(`Esportazione non riuscita: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setFile(null);
    setPreview(null);
    setDone(null);
    setError(null);
    if (!f) return;
    setBusy("Leggo il file…");
    try {
      const buf = new Uint8Array(await f.arrayBuffer());
      let loaded: Loaded;
      if (f.name.toLowerCase().endsWith(".zip")) {
        const entries = unzipSync(buf);
        const jsonEntry = entries["catalogo.json"];
        if (!jsonEntry) throw new Error("nello ZIP manca catalogo.json");
        const photos = Object.fromEntries(Object.entries(entries).filter(([k]) => k.startsWith("foto/") && !k.endsWith("/")));
        loaded = { name: f.name, json: strFromU8(jsonEntry), photos };
      } else {
        loaded = { name: f.name, json: strFromU8(buf), photos: {} };
      }
      setFile(loaded);
      setBusy("Controllo i dati…");
      setPreview(await importCatalogAction(loaded.json, true));
    } catch (err) {
      setError(`File non leggibile: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function runImport() {
    if (!file) return;
    setError(null);
    setBusy("Importo i dati…");
    try {
      const report = await importCatalogAction(file.json, false);
      if (report.errors.length) {
        setPreview(report);
        return;
      }
      // Foto dallo ZIP, una richiesta per foto. Se il link originale risponde (stesso
      // ambiente, foto del repo) la foto c'è già: non si ricarica né si duplica.
      type Row = { slug: string; image: string | null; imageFile: string | null };
      const products = (JSON.parse(file.json) as { products: Row[] }).products;
      const candidates = products.filter((p) => p.imageFile && file.photos[p.imageFile] && report.ids[p.slug]);
      const photoErrors: string[] = [];
      let uploaded = 0;
      for (const [i, p] of candidates.entries()) {
        setBusy(`Foto… ${i + 1}/${candidates.length}`);
        if (p.image && (await reachable(p.image))) continue;
        const fd = new FormData();
        fd.set("productId", report.ids[p.slug]);
        fd.set("image", new File([file.photos[p.imageFile!] as BlobPart], p.imageFile!.slice(5)));
        const r = await uploadImageAction({}, fd);
        const msg = r.error ?? r.fieldErrors?.image?.[0];
        if (msg) photoErrors.push(`${p.slug}: ${msg}`);
        else uploaded++;
      }
      setPreview(null);
      setFile(null);
      setDone(
        `Importati: ${report.created.length} nuovi, ${report.updated.length} aggiornati; foto caricate ${uploaded}, già presenti ${candidates.length - uploaded - photoErrors.length}.` +
          (photoErrors.length ? ` Foto non caricate: ${photoErrors.join("; ")}` : ""),
      );
    } catch (e) {
      setError(`Importazione non riuscita: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  const photoCount = file ? Object.keys(file.photos).length : 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={exportZip} disabled={!!busy} className={`${btn} border-white/60 bg-black text-white hover:bg-zinc-800`}>
          Esporta ZIP
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`${btn} border-white/60 bg-black text-white hover:bg-zinc-800`}
        >
          {open ? "× Chiudi importazione" : "Importa…"}
        </button>
        {busy && <span className="text-sm text-zinc-400">{busy}</span>}
        {done && !busy && <span role="status" className="text-sm text-green-400">{done}</span>}
        {error && <span role="alert" className="text-sm text-red-400">{error}</span>}
      </div>
      {open && (
        <section aria-label="Importa catalogo" className="flex flex-col gap-3 card p-5">
          <h2 className="font-display text-[17px] font-black uppercase">Importa catalogo</h2>
          <p className="text-sm text-zinc-400">
            ZIP esportato da qui (dati e foto) o solo <code>catalogo.json</code>. I prodotti si riconoscono dallo slug: i
            nuovi si aggiungono, gli esistenti si aggiornano, nessuno viene cancellato. Prima vedi l&apos;anteprima; con un
            errore non si salva niente.
          </p>
          <input
            type="file"
            accept=".zip,.json,application/zip,application/json"
            onChange={pick}
            disabled={!!busy}
            className="text-sm text-zinc-300 file:mr-3 file:cursor-pointer file:border file:border-white/60 file:bg-black file:px-3 file:py-1.5 file:text-[13px] file:font-bold file:text-white hover:file:bg-zinc-800"
          />
          {preview && (
            <div className="flex flex-col gap-2 text-sm">
              <p>
                <strong>{file?.name}</strong>: {preview.created.length} nuovi, {preview.updated.length} da aggiornare
                {photoCount > 0 && `, ${photoCount} foto`}.
              </p>
              {preview.errors.length > 0 && (
                <ul className="flex flex-col gap-1 text-red-400">
                  {preview.errors.slice(0, 20).map((e) => (
                    <li key={e.slug + e.message}>
                      <strong>{e.slug}</strong>: {e.message}
                    </li>
                  ))}
                  {preview.errors.length > 20 && <li>… e altri {preview.errors.length - 20} errori.</li>}
                </ul>
              )}
              {preview.created.length > 0 && (
                <p className="text-zinc-400">Nuovi: {preview.created.slice(0, 10).join(", ")}{preview.created.length > 10 && "…"}</p>
              )}
              <button
                type="button"
                onClick={runImport}
                disabled={!!busy || preview.errors.length > 0}
                className={`${btn} self-start border-buckled-yellow bg-buckled-yellow text-black hover:bg-buckled-orange`}
              >
                Importa
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
