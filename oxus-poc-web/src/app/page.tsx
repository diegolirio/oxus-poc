import { Button, Header } from "@/components/ui";

export default function Home() {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-[720px] flex-col items-start gap-4 px-6 py-16">
        <span className="text-xs font-semibold tracking-[.06em] text-brand-content uppercase">Câmbio</span>
        <h1 className="text-4xl leading-[44px] font-bold">oxus-poc</h1>
        <p className="text-base leading-6 text-neutral-secondary">POC de integração com a API da OXUS para câmbio BRL → USD.</p>
        <Button href="/cambio" size="sm" className="mt-2">
          Testar remessa no sandbox
        </Button>
      </main>
    </>
  );
}
