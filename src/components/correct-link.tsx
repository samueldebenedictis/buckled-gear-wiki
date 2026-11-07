import Link from "next/link";

/** Invito a correggere o completare la scheda (serve l'accesso). */
export function CorrectLink({ productId }: { productId: string }) {
  return (
    <p className="-mt-2 text-sm text-zinc-600">
      Manca un dato o è sbagliato?{" "}
      <Link href={`/proposte?correggi=${productId}#correzione`} className="font-bold text-black underline">
        Correggi la scheda
      </Link>
    </p>
  );
}
