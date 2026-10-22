import type { Metadata } from "next";
import CambioFlow from "@/components/CambioFlow";

export const metadata: Metadata = { title: "Câmbio · oxus-poc" };

export default function CambioPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">Sandbox OXUS</p>
        <h1 className="text-2xl font-semibold">Remessa BRL → exterior</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Cliente e conta prontos do sandbox, cotação, PIX e acompanhamento. Nenhum dinheiro de verdade.
        </p>
      </header>
      <CambioFlow />
    </main>
  );
}
