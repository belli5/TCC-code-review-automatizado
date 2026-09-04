import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Esteira de compra (e2e)', () => {
  let app: INestApplication;

  const http = () => request(app.getHttpServer());

  const BASE_CHECKOUT = {
    customer: { name: 'Gabriel Souza', email: 'gabriel@teste.com' },
    address: {
      zipCode: '01310-100',
      street: 'Av. Paulista',
      number: '1000',
      district: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    },
    shippingServiceId: 'SEDEX',
  };

  const APPROVED_CARD = {
    method: 'credit_card',
    installments: 3,
    card: {
      number: '4242424242424242',
      holderName: 'GABRIEL SOUZA',
      expMonth: 12,
      expYear: 2030,
      cvv: '123',
    },
  };

  const DECLINED_CARD = {
    method: 'credit_card',
    card: { ...APPROVED_CARD.card, number: '4111000000080000' },
  };

  let tenisId: string;

  async function stockOf(idOrSlug: string): Promise<number> {
    const res = await http().get(`/products/${idOrSlug}`).expect(200);
    return res.body.stock;
  }

  function checkout(body: Record<string, unknown>) {
    return http().post('/orders').send(body);
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    const tenis = await http().get('/products/tenis-runner').expect(200);
    tenisId = tenis.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Catálogo', () => {
    it('GET /products devolve a página com o total', async () => {
      const res = await http().get('/products').expect(200);

      expect(res.body.total).toBe(12);
      expect(res.body.items).toHaveLength(12);
      expect(res.body.page).toBe(1);
    });

    it('pagina os resultados', async () => {
      const first = await http().get('/products?pageSize=5&page=1').expect(200);
      const second = await http().get('/products?pageSize=5&page=2').expect(200);

      expect(first.body.items).toHaveLength(5);
      expect(first.body.totalPages).toBe(3);
      expect(second.body.items[0].id).not.toBe(first.body.items[0].id);
    });

    it('filtra por categoria', async () => {
      const res = await http().get('/products?category=calcados').expect(200);

      expect(res.body.total).toBe(3);
      expect(res.body.items.every((p: { category: string }) => p.category === 'calcados')).toBe(
        true,
      );
    });

    it('busca por nome', async () => {
      const res = await http().get('/products?search=mochila').expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.items[0].slug).toBe('mochila-urbana');
    });

    it('esconde os esgotados com inStock=true', async () => {
      const todos = await http().get('/products').expect(200);
      const disponiveis = await http().get('/products?inStock=true').expect(200);

      expect(disponiveis.body.total).toBe(todos.body.total - 1);
      expect(
        disponiveis.body.items.every((p: { inStock: boolean }) => p.inStock),
      ).toBe(true);
    });

    it('ordena por preço', async () => {
      const res = await http().get('/products?sort=price_asc').expect(200);
      const precos = res.body.items.map((p: { priceCents: number }) => p.priceCents);

      expect(precos).toEqual([...precos].sort((a, b) => a - b));
    });

    it('filtra por preço máximo', async () => {
      const res = await http().get('/products?maxPriceCents=10000').expect(200);

      expect(res.body.total).toBeGreaterThan(0);
      expect(
        res.body.items.every((p: { priceCents: number }) => p.priceCents <= 10000),
      ).toBe(true);
    });

    it('recusa um parâmetro de ordenação inválido', async () => {
      await http().get('/products?sort=aleatorio').expect(400);
    });

    it('GET /products/categories devolve as categorias com contagem', async () => {
      const res = await http().get('/products/categories').expect(200);

      const calcados = res.body.find((c: { slug: string }) => c.slug === 'calcados');
      expect(calcados).toMatchObject({ label: 'Calçados', count: 3 });
    });

    it('aceita id ou slug no detalhe do produto', async () => {
      const porSlug = await http().get('/products/tenis-runner').expect(200);
      const porId = await http().get(`/products/${porSlug.body.id}`).expect(200);

      expect(porId.body.slug).toBe('tenis-runner');
    });

    it('calcula nota média e desconto no detalhe', async () => {
      const res = await http().get('/products/tenis-runner').expect(200);

      expect(res.body.reviews).toHaveLength(3);
      expect(res.body.rating).toBeCloseTo(4.7, 1);
      expect(res.body.discountPercent).toBe(24);
    });

    it('devolve 404 para produto inexistente', async () => {
      await http().get('/products/nao-existe').expect(404);
    });
  });

  describe('Avaliações', () => {
    it('aceita uma avaliação nova e recalcula a média', async () => {
      const antes = await http().get('/products/garrafa-termica').expect(200);

      await http()
        .post('/products/garrafa-termica/reviews')
        .send({ author: 'Testador', rating: 1, comment: 'Vazou no primeiro dia.' })
        .expect(201);

      const depois = await http().get('/products/garrafa-termica').expect(200);

      expect(depois.body.reviewsCount).toBe(antes.body.reviewsCount + 1);
      expect(depois.body.rating).toBeLessThan(antes.body.rating);
      expect(depois.body.ratingBreakdown['1']).toBe(1);
    });

    it('recusa nota fora de 1 a 5', async () => {
      await http()
        .post('/products/garrafa-termica/reviews')
        .send({ author: 'Testador', rating: 9, comment: 'Nota inválida' })
        .expect(400);
    });

    it('recusa avaliação em produto inexistente', async () => {
      await http()
        .post('/products/nao-existe/reviews')
        .send({ author: 'Testador', rating: 5, comment: 'Comentário' })
        .expect(404);
    });
  });

  describe('Cupons', () => {
    it('lista os cupons ativos', async () => {
      const res = await http().get('/coupons').expect(200);
      expect(res.body.map((c: { code: string }) => c.code)).toContain('BEMVINDO10');
    });

    it('aplica o percentual e ignora a caixa do código', async () => {
      const res = await http()
        .post('/coupons/validate')
        .send({ code: 'bemvindo10', subtotalCents: 50000 })
        .expect(200);

      expect(res.body).toMatchObject({ code: 'BEMVINDO10', discountCents: 5000 });
    });

    it('recusa abaixo do valor mínimo explicando o que falta', async () => {
      const res = await http()
        .post('/coupons/validate')
        .send({ code: 'MENOS50', subtotalCents: 10000 })
        .expect(400);

      expect(res.body.message).toMatch(/R\$\s300,00/);
    });

    it('devolve 404 para código inexistente', async () => {
      await http()
        .post('/coupons/validate')
        .send({ code: 'NAOEXISTE', subtotalCents: 10000 })
        .expect(404);
    });
  });

  describe('Frete', () => {
    const items = () => [{ productId: tenisId, quantity: 1 }];

    it('cota as três modalidades para um CEP do Sudeste', async () => {
      const res = await http()
        .post('/shipping/quote')
        .send({ zipCode: '01310-100', items: items() })
        .expect(200);

      expect(res.body.zone).toBe('sudeste');
      expect(res.body.options.map((o: { id: string }) => o.id)).toEqual([
        'PAC',
        'SEDEX',
        'EXPRESS',
      ]);
    });

    it('cobra mais caro e mais demorado para o Norte', async () => {
      const sudeste = await http()
        .post('/shipping/quote')
        .send({ zipCode: '01310-100', items: items() });
      const norte = await http()
        .post('/shipping/quote')
        .send({ zipCode: '69000-000', items: items() });

      expect(norte.body.options[1].priceCents).toBeGreaterThan(
        sudeste.body.options[1].priceCents,
      );
      expect(norte.body.options[1].etaDays).toBeGreaterThan(sudeste.body.options[1].etaDays);
    });

    it('zera o econômico acima da faixa de frete grátis', async () => {
      const res = await http()
        .post('/shipping/quote')
        .send({ zipCode: '01310-100', items: [{ productId: tenisId, quantity: 2 }] })
        .expect(200);

      expect(res.body.options[0].priceCents).toBe(0);
      expect(res.body.options[0].freeShippingApplied).toBe(true);
    });

    it('recusa CEP inválido', async () => {
      await http()
        .post('/shipping/quote')
        .send({ zipCode: '123', items: items() })
        .expect(400);
    });
  });

  describe('Checkout com cartão aprovado', () => {
    let order: Record<string, any>;
    let estoqueAntes: number;

    beforeAll(async () => {
      estoqueAntes = await stockOf(tenisId);
      const res = await checkout({
        ...BASE_CHECKOUT,
        items: [{ productId: tenisId, quantity: 2 }],
        couponCode: 'BEMVINDO10',
        payment: APPROVED_CARD,
      }).expect(201);
      order = res.body;
    });

    it('aprova o pagamento na hora', () => {
      expect(order.status).toBe('paid');
      expect(order.payment.status).toBe('paid');
      expect(order.payment.card).toMatchObject({ brand: 'visa', last4: '4242' });
    });

    it('gera um número de pedido legível', () => {
      expect(order.number).toMatch(/^LS-\d{8}-[0-9A-F]{6}$/);
    });

    it('reprecifica pelo catálogo e aplica desconto e frete', () => {
      expect(order.totals.subtotalCents).toBe(49980);
      expect(order.totals.discountCents).toBe(4998);
      expect(order.totals.totalCents).toBe(
        order.totals.subtotalCents - order.totals.discountCents + order.totals.shippingCents,
      );
    });

    it('divide as parcelas sem perder centavos', () => {
      expect(order.payment.installments).toBe(3);
      expect(order.payment.installmentCents * 3).toBeGreaterThanOrEqual(
        order.totals.totalCents,
      );
    });

    it('baixa o estoque', async () => {
      expect(await stockOf(tenisId)).toBe(estoqueAntes - 2);
    });

    it('registra a linha do tempo do pedido', () => {
      expect(order.timeline.map((e: { status: string }) => e.status)).toEqual([
        'awaiting_payment',
        'paid',
      ]);
    });

    it('copia nome e preço do produto para o item, congelando o histórico', () => {
      expect(order.items[0]).toMatchObject({
        name: 'Tênis Runner',
        unitPriceCents: 24990,
        quantity: 2,
        subtotalCents: 49980,
      });
    });

    it('permite buscar o pedido pelo número', async () => {
      const res = await http().get(`/orders/${order.number}`).expect(200);
      expect(res.body.id).toBe(order.id);
    });
  });

  describe('Checkout — validações', () => {
    it('rejeita preço enviado pelo cliente', async () => {
      const res = await checkout({
        ...BASE_CHECKOUT,
        items: [{ productId: tenisId, quantity: 1, priceCents: 1 }],
        payment: { method: 'pix' },
      }).expect(400);

      expect(JSON.stringify(res.body.message)).toContain('priceCents');
    });

    it('recusa carrinho vazio', async () => {
      await checkout({ ...BASE_CHECKOUT, items: [], payment: { method: 'pix' } }).expect(400);
    });

    it('recusa e-mail inválido', async () => {
      await checkout({
        ...BASE_CHECKOUT,
        customer: { name: 'Gabriel Souza', email: 'nao-e-email' },
        items: [{ productId: tenisId, quantity: 1 }],
        payment: { method: 'pix' },
      }).expect(400);
    });

    it('recusa forma de entrega desconhecida', async () => {
      await checkout({
        ...BASE_CHECKOUT,
        shippingServiceId: 'DRONE',
        items: [{ productId: tenisId, quantity: 1 }],
        payment: { method: 'pix' },
      }).expect(400);
    });

    it('recusa cartão sem os dados do cartão', async () => {
      await checkout({
        ...BASE_CHECKOUT,
        items: [{ productId: tenisId, quantity: 1 }],
        payment: { method: 'credit_card' },
      }).expect(400);
    });

    it('recusa produto esgotado devolvendo 409', async () => {
      const esgotado = await http().get('/products/chinelo-slide').expect(200);

      const res = await checkout({
        ...BASE_CHECKOUT,
        items: [{ productId: esgotado.body.id, quantity: 1 }],
        payment: { method: 'pix' },
      }).expect(409);

      expect(res.body.message).toContain('Estoque insuficiente');
    });

    it('recusa quantidade acima do estoque', async () => {
      await checkout({
        ...BASE_CHECKOUT,
        items: [{ productId: tenisId, quantity: 9999 }],
        payment: { method: 'pix' },
      }).expect(409);
    });
  });

  describe('Checkout com cartão recusado', () => {
    it('marca o pedido como recusado e devolve o estoque', async () => {
      const antes = await stockOf(tenisId);

      const res = await checkout({
        ...BASE_CHECKOUT,
        items: [{ productId: tenisId, quantity: 1 }],
        payment: DECLINED_CARD,
      }).expect(201);

      expect(res.body.status).toBe('payment_failed');
      expect(res.body.payment.declineReason).toBe('insufficient_funds');
      expect(res.body.payment.declineMessage).toContain('saldo');
      expect(await stockOf(tenisId)).toBe(antes);
    });

    it('não deixa avançar um pedido recusado', async () => {
      const res = await checkout({
        ...BASE_CHECKOUT,
        items: [{ productId: tenisId, quantity: 1 }],
        payment: DECLINED_CARD,
      });

      await http().post(`/orders/${res.body.id}/advance`).expect(400);
    });
  });

  describe('Pagamento por PIX', () => {
    let order: Record<string, any>;

    beforeAll(async () => {
      const res = await checkout({
        ...BASE_CHECKOUT,
        shippingServiceId: 'PAC',
        items: [{ productId: tenisId, quantity: 1 }],
        couponCode: 'FRETEGRATIS',
        payment: { method: 'pix' },
      }).expect(201);
      order = res.body;
    });

    it('nasce aguardando pagamento com o código gerado', () => {
      expect(order.status).toBe('awaiting_payment');
      expect(order.payment.status).toBe('pending');
      expect(order.payment.pix.code).toContain('br.gov.bcb.pix');
      expect(order.payment.pix.expired).toBe(false);
    });

    it('o cupom de frete grátis zera o frete', () => {
      expect(order.totals.shippingCents).toBe(0);
      expect(order.coupon.code).toBe('FRETEGRATIS');
    });

    it('o webhook confirma o pagamento e move o pedido para pago', async () => {
      const res = await http()
        .post(`/payments/${order.payment.id}/confirm`)
        .expect(200);

      expect(res.body.status).toBe('paid');
      expect(res.body.payment.paidAt).not.toBeNull();
      expect(res.body.timeline.map((e: { status: string }) => e.status)).toEqual([
        'awaiting_payment',
        'paid',
      ]);
      order = res.body;
    });

    it('confirmar de novo é idempotente', async () => {
      const res = await http().post(`/payments/${order.payment.id}/confirm`).expect(200);
      expect(res.body.status).toBe('paid');
    });

    it('a rota de webhook aceita o mesmo pagamento por corpo', async () => {
      await http()
        .post('/payments/webhook')
        .send({ paymentId: order.payment.id })
        .expect(200);
    });

    it('devolve 404 confirmando um pagamento inexistente', async () => {
      await http().post('/payments/nao-existe/confirm').expect(404);
    });
  });

  describe('Pagamento por boleto', () => {
    it('gera linha digitável com 47 dígitos', async () => {
      const res = await checkout({
        ...BASE_CHECKOUT,
        items: [{ productId: tenisId, quantity: 1 }],
        payment: { method: 'boleto' },
      }).expect(201);

      const linha = res.body.payment.boleto.digitableLine;
      expect(linha.replace(/\D/g, '')).toHaveLength(47);
      expect(res.body.status).toBe('awaiting_payment');
    });

    it('não aceita webhook para pagamento com cartão', async () => {
      const res = await checkout({
        ...BASE_CHECKOUT,
        items: [{ productId: tenisId, quantity: 1 }],
        payment: APPROVED_CARD,
      }).expect(201);

      const confirm = await http()
        .post(`/payments/${res.body.payment.id}/confirm`)
        .expect(200);
      expect(confirm.body.status).toBe('paid');
    });
  });

  describe('Esteira de fulfillment', () => {
    let orderId: string;

    beforeAll(async () => {
      const res = await checkout({
        ...BASE_CHECKOUT,
        items: [{ productId: tenisId, quantity: 1 }],
        payment: APPROVED_CARD,
      }).expect(201);
      orderId = res.body.id;
    });

    it('separa, despacha e entrega, nessa ordem', async () => {
      const separado = await http().post(`/orders/${orderId}/advance`).expect(200);
      expect(separado.body.status).toBe('processing');

      const enviado = await http().post(`/orders/${orderId}/advance`).expect(200);
      expect(enviado.body.status).toBe('shipped');
      expect(enviado.body.shipping.trackingCode).toMatch(/^BR\d{9}LS$/);

      const entregue = await http().post(`/orders/${orderId}/advance`).expect(200);
      expect(entregue.body.status).toBe('delivered');
      expect(entregue.body.timeline.map((e: { status: string }) => e.status)).toEqual([
        'awaiting_payment',
        'paid',
        'processing',
        'shipped',
        'delivered',
      ]);
    });

    it('não avança além de entregue', async () => {
      await http().post(`/orders/${orderId}/advance`).expect(400);
    });

    it('não cancela um pedido já entregue', async () => {
      await http().post(`/orders/${orderId}/cancel`).send({}).expect(409);
    });
  });

  describe('Cancelamento', () => {
    it('devolve o estoque e estorna o pagamento', async () => {
      const criado = await checkout({
        ...BASE_CHECKOUT,
        items: [{ productId: tenisId, quantity: 2 }],
        payment: APPROVED_CARD,
      }).expect(201);

      const estoqueComPedido = await stockOf(tenisId);

      const res = await http()
        .post(`/orders/${criado.body.id}/cancel`)
        .send({ reason: 'Comprei sem querer' })
        .expect(200);

      expect(res.body.status).toBe('cancelled');
      expect(res.body.cancelReason).toBe('Comprei sem querer');
      expect(res.body.payment.status).toBe('refunded');
      expect(await stockOf(tenisId)).toBe(estoqueComPedido + 2);
    });

    it('devolve 404 para pedido inexistente', async () => {
      await http().post('/orders/nao-existe/cancel').send({}).expect(404);
    });
  });

  describe('Listagem de pedidos', () => {
    it('filtra por e-mail do cliente', async () => {
      const res = await http().get('/orders?email=gabriel@teste.com').expect(200);

      expect(res.body.total).toBeGreaterThan(0);
      expect(
        res.body.items.every(
          (o: { customer: { email: string } }) => o.customer.email === 'gabriel@teste.com',
        ),
      ).toBe(true);
    });

    it('não devolve pedidos de outro e-mail', async () => {
      const res = await http().get('/orders?email=ninguem@teste.com').expect(200);
      expect(res.body.total).toBe(0);
    });

    it('filtra por status para o painel do lojista', async () => {
      const res = await http().get('/orders?status=delivered').expect(200);

      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body.items.every((o: { status: string }) => o.status === 'delivered')).toBe(
        true,
      );
    });

    it('recusa status desconhecido', async () => {
      await http().get('/orders?status=em_transito').expect(400);
    });
  });

  describe('Cartões de teste', () => {
    it('a API publica os cartões de cada cenário', async () => {
      const res = await http().get('/payments/test-cards').expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(3);
      expect(res.body.some((c: { outcome: string }) => c.outcome === 'Aprovado')).toBe(true);
    });
  });
});
