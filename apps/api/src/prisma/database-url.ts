// Caminho relativo de propósito: `file:C:\...` quebra o Prisma Studio, que lê o
// `C:` como protocolo da URL.
export function resolveDatabaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL;
  if (fromEnv && fromEnv.trim() !== '') {
    return fromEnv.trim();
  }
  return 'file:./prisma/dev.db';
}
