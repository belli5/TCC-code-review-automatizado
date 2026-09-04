# Loja Simples — monorepo de e-commerce

E-commerce completo com **Next.js 14** (App Router) e **NestJS 10**, com persistência em
**Prisma + SQLite**. Cobre a esteira de compra inteira: catálogo, carrinho, cupom, frete por
CEP, pagamento (cartão, PIX e boleto **fictícios**), acompanhamento do pedido e painel do
lojista.

> Nenhuma cobrança real acontece. O gateway de pagamento é simulado — veja
> [Pagamento fictício](#pagamento-fictício).

## Como rodar

```bash
npm install         # instala tudo e gera o client do Prisma
npm run db:setup    # cria o banco SQLite e popula o catálogo
npm run dev:api     # API em http://localhost:3001
npm run dev:web     # loja em http://localhost:3000 (outro terminal)
```

O banco é um arquivo (`apps/api/prisma/dev.db`) — não é preciso Docker nem servidor de banco.
Para trocar por PostgreSQL, mude o `provider` em `apps/api/prisma/schema.prisma` e a
`DATABASE_URL`.

## Estrutura

```
apps/
  api/                         NestJS
    prisma/schema.prisma       7 tabelas: produto, avaliação, cupom, pedido,
    prisma/seed.ts             item, evento e pagamento
    src/common/                dinheiro em centavos, máquina de estados, validadores
    src/products/              catálogo, filtros, avaliações
    src/coupons/               regras de desconto (função pura)
    src/shipping/              cálculo de frete por região do CEP (função pura)
    src/payments/gateway/      gateway fictício, BR Code do PIX, boleto
    src/orders/                checkout, esteira de status, webhook
    test/app.e2e-spec.ts       58 testes de integração da esteira completa
  web/                         Next.js
    app/                       páginas
    components/                UI reutilizável
    lib/                       cliente da API, formatação, storage
```

## Páginas

| Rota | O que faz |
|---|---|
| `/` | Vitrine: destaques, promoções, mais bem avaliados, categorias |
| `/busca` | Catálogo com filtros de categoria, preço, estoque, ordenação e paginação |
| `/product/[id]` | Detalhe com avaliações, estoque, seletor de quantidade e simulador de frete |
| `/cart` | Carrinho com cupom e estimativa de frete |
| `/checkout` | Wizard de 4 etapas: Dados → Entrega → Pagamento → Revisão |
| `/pedido/[id]` | Acompanhamento: linha do tempo, QR Code do PIX, rastreio, cancelamento |
| `/meus-pedidos` | Histórico por e-mail (a loja não tem login) |
| `/admin/pedidos` | Painel do lojista: separar → despachar → entregar |

## A esteira de compra

```
       POST /orders
            │
            ├── reprecifica pelo catálogo   (o cliente manda só id + quantidade)
            ├── valida o cupom              (percentual, valor fixo, frete grátis)
            ├── cota o frete pelo CEP       (peso real dos produtos)
            ├── reserva o estoque           (UPDATE condicional: sem venda a descoberto)
            └── cria o pagamento
                     │
     ┌───────────────┴────────────────┐
  cartão                        PIX / boleto
     │                                │
  aprovado → pago              pendente → webhook → pago
  recusado → devolve estoque
                     │
        pago → em separação → enviado (gera rastreio) → entregue
                     │
                 cancelado (devolve estoque, estorna)
```

**O preço nunca vem do cliente.** O checkout aceita apenas `productId` e `quantity`; subtotal,
desconto, frete e total são recalculados no servidor a partir do catálogo. Sem isso, bastaria o
DevTools para comprar um tênis por um real.

**Estoque não é vendido a descoberto.** A baixa é um `UPDATE ... WHERE stock >= quantidade`
dentro da transação: se outra compra levou a última peça no meio do caminho, nenhuma linha é
afetada e o pedido inteiro é desfeito.

## Pagamento fictício

Não existe adquirente do outro lado, mas as validações são as de verdade e o resultado é
determinístico — dá para reproduzir "cartão sem saldo" quantas vezes quiser.

**Cartão de crédito** — o número precisa passar no algoritmo de Luhn, a validade precisa estar
no futuro e o CVV precisa ter o tamanho certo. A decisão sai dos quatro últimos dígitos:

| Cartão | Resultado |
|---|---|
| `4242 4242 4242 4242` | Aprovado |
| `5555 5555 5555 4444` | Aprovado |
| `4111 0000 0008 0000` | Recusado: saldo insuficiente |
| `5555 0000 0006 0002` | Recusado: suspeita de fraude |
| `4000 0000 0000 0069` | Recusado pelo emissor |

A lista também está em `GET /payments/test-cards` e aparece na própria tela de pagamento.

**PIX** — gera um payload no padrão EMV®QRCPS do Banco Central, com os campos corretos e
**CRC16 de verdade**. A chave é fictícia, então nenhum banco real reconhece o código, e o QR
Code exibido é uma representação visual. O botão "Simular pagamento" faz o papel do webhook
que o PSP chamaria.

**Boleto** — linha digitável de 47 dígitos com dígito verificador módulo 10 em cada campo e
fator de vencimento no padrão FEBRABAN (validado contra os exemplos publicados: 03/07/2000 =
fator 1000).

## Cupons e frete

Cupons do seed: `BEMVINDO10` (10%), `FRETEGRATIS` (acima de R$ 150), `MENOS50` (R$ 50 acima de
R$ 300) e `BLACKFRIDAY` (25% acima de R$ 400).

O frete varia por região do CEP (Sudeste, Sul, Centro-Oeste, Nordeste, Norte) e pelo peso somado
dos produtos, em três modalidades — Econômico, Rápido e Expresso. Acima de **R$ 299** o
Econômico sai de graça.

## Dinheiro em centavos

Todo valor monetário é um inteiro em centavos, no banco e na API. Em ponto flutuante,
`0.1 + 0.2` dá `0.30000000000000004`; num carrinho com preço × quantidade × desconto × frete,
esse resto vira divergência de um centavo entre a tela e a cobrança. As telas convertem só na
hora de exibir.

## API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/products` | Lista com `search`, `category`, `sort`, `inStock`, `maxPriceCents`, `page` |
| GET | `/products/categories` | Categorias com contagem |
| GET | `/products/:idOrSlug` | Detalhe com avaliações e distribuição de notas |
| POST | `/products/:idOrSlug/reviews` | Nova avaliação |
| GET | `/coupons` | Cupons ativos |
| POST | `/coupons/validate` | Valida um cupom contra um subtotal |
| POST | `/shipping/quote` | Cota frete por CEP e itens |
| POST | `/orders` | Checkout |
| GET | `/orders` | Lista com `email` ou `status` |
| GET | `/orders/:idOrNumber` | Pedido com linha do tempo e pagamento |
| POST | `/orders/:id/advance` | Avança na esteira de fulfillment |
| POST | `/orders/:id/cancel` | Cancela e devolve o estoque |
| POST | `/payments/:id/confirm` | Confirma PIX ou boleto (webhook simulado) |
| GET | `/payments/test-cards` | Cartões de teste |

## Testes

```bash
npm run test        # 137 unitários (107 API + 30 Web)
npm run test:e2e    # 58 de integração da esteira completa
npm run ci          # lint + typecheck + build + testes
```

Os testes unitários cobrem a lógica pura — divisão de parcelas, máquina de estados, regras de
cupom, faixas de frete, Luhn, CRC16 do PIX, módulo 10 do boleto — sem banco e sem HTTP. Os e2e
sobem a aplicação inteira contra um SQLite descartável, recriado a cada execução, e percorrem a
esteira do catálogo à entrega.

## Comandos úteis

| Comando | O que faz |
|---|---|
| `npm run db:setup` | Gera o client, cria o banco e popula o catálogo |
| `npm run db:seed` | Repopula o catálogo |
| `npm run db:generate` | Regenera o client tipado do Prisma |
