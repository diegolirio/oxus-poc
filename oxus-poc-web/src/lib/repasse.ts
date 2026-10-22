// O navegador so fala com o Next; os Route Handlers repassam ao oxus-poc-api
// de servidor para servidor (INSTRUCTIONS.md, "CORS e como -web e -mobile
// alcancam o -api"). Status e corpo do -api voltam como vieram.
const API_URL = process.env.OXUS_POC_API_URL ?? "http://localhost:8080";

export async function repassar(path: string, init?: RequestInit): Promise<Response> {
  try {
    const resposta = await fetch(`${API_URL}${path}`, { ...init, cache: "no-store" });
    return new Response(resposta.body, {
      status: resposta.status,
      headers: { "Content-Type": resposta.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return Response.json(
      { status: 502, detail: "O oxus-poc-api nao respondeu." },
      { status: 502, headers: { "Content-Type": "application/problem+json" } },
    );
  }
}
