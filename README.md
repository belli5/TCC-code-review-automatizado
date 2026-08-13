# Ecommerce Monorepo (Nest + Next)

Monorepo bem simples com:
- `apps/api` — backend em NestJS (produtos e pedidos, dados em memória)
- `apps/web` — frontend em Next.js (App Router) — lista de produtos, detalhe, carrinho e checkout

## Como rodar localmente

Requisitos: Node.js 18+ e npm.

### 1. Instalar dependências (na raiz do projeto)

```bash
npm install
```

Isso instala as dependências dos dois workspaces (api e web) de uma vez.

### 2. Rodar a API (NestJS) — porta 3001

```bash
npm run dev:api
```

### 3. Rodar o front (Next.js) — porta 3000

Em outro terminal:

```bash
npm run dev:web
```

### 4. Acessar

Abra http://localhost:3000

A API roda em http://localhost:3001 (o front já está configurado para consumi-la via `NEXT_PUBLIC_API_URL`, veja `apps/web/.env.local`).

## Funcionalidades

- Lista de produtos (`GET /products`)
- Detalhe de produto (`GET /products/:id`)
- Carrinho no front (Context API + localStorage)
- Checkout que cria um pedido na API (`POST /orders`), com dados em memória (reinicia ao reiniciar a API)

## Estrutura

```
ecommerce-monorepo/
  apps/
    api/   -> NestJS
    web/   -> Next.js
```

Este é um projeto propositalmente simples, pensado como ponto de partida — sem banco de dados, autenticação ou pagamento real.
