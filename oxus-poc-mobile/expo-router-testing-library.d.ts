// expo-router/testing-library registra estes matchers em runtime
// (expect.extend em build/testing-library/expect.js) mas o pacote nao
// publica os tipos deles (build/testing-library/expect.d.ts so tem
// `export {}`). Sem isto, `tsc --noEmit` acusa erro no matcher que o
// template desta skill usa (toHavePathname).
declare global {
  namespace jest {
    interface Matchers<R> {
      toHavePathname(pathname: string): R;
      toHavePathnameWithParams(pathname: string): R;
      toHaveSegments(segments: string[]): R;
      toHaveSearchParams(params: Record<string, string | string[]>): R;
      toHaveRouterState(state: unknown): R;
    }
  }
}

export {};
