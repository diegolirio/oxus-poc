/** Header do Colmeia: barra branca de 64px com a marca à esquerda e o usuário à direita. */
export function Header({ userName, userEmail }: { userName?: string; userEmail?: string }) {
  return (
    <header className="flex min-h-16 items-center justify-between border-b border-border-default bg-surface px-5 py-4">
      <span className="text-lg font-bold text-neutral-default">PagBank</span>
      {userName && (
        <div className="text-left">
          <span className="block text-base text-neutral-default">{userName}</span>
          {userEmail && <span className="block text-xs text-neutral-secondary">{userEmail}</span>}
        </div>
      )}
    </header>
  );
}
