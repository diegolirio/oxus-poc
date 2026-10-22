import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">oxus-poc</h1>
      <p className="text-zinc-600 dark:text-zinc-400">POC de integração com a API da OXUS para câmbio BRL → USD.</p>
      <Link href="/cambio" className="self-start rounded-lg bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800">
        Testar remessa no sandbox
      </Link>
    </main>
  );
}
