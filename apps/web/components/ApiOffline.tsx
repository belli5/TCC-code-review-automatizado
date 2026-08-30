export function ApiOffline() {
  return (
    <div className="empty">
      <h2>Não consegui falar com a API</h2>
      <p>
        Verifique se ela está rodando em <code>http://localhost:3001</code>.
      </p>
      <pre className="code-block">
        npm run dev:api
      </pre>
      <p className="muted">
        Se for a primeira vez, rode antes <code>npm run db:setup</code> na raiz do projeto para
        criar o banco e popular o catálogo.
      </p>
    </div>
  );
}
