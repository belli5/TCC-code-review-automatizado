import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../src/generated/prisma/client';
import { resolveDatabaseUrl } from '../src/prisma/database-url';

const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: resolveDatabaseUrl() }) });

function image(text: string): string {
  return `https://placehold.co/600x600?text=${encodeURIComponent(text)}`;
}

interface SeedProduct {
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  compareAtPriceCents?: number;
  category: string;
  stock: number;
  weightGrams: number;
  reviews: { author: string; rating: number; comment: string }[];
}

const PRODUCTS: SeedProduct[] = [
  {
    slug: 'camiseta-basica',
    name: 'Camiseta Básica',
    description:
      'Camiseta 100% algodão penteado, gola reforçada e caimento reto. Confortável para o dia a dia e fácil de combinar.',
    priceCents: 5990,
    compareAtPriceCents: 7990,
    category: 'roupas',
    stock: 42,
    weightGrams: 220,
    reviews: [
      { author: 'Marina S.', rating: 5, comment: 'Tecido macio e não desbotou na primeira lavagem.' },
      { author: 'Rafael T.', rating: 4, comment: 'Ótima, mas veste um pouco larga. Peguei um número abaixo.' },
    ],
  },
  {
    slug: 'moletom-com-capuz',
    name: 'Moletom com Capuz',
    description:
      'Moletom flanelado por dentro, com bolso canguru e cordão ajustável. Peça pesada, para os dias frios de verdade.',
    priceCents: 18990,
    category: 'roupas',
    stock: 18,
    weightGrams: 780,
    reviews: [
      { author: 'Camila R.', rating: 5, comment: 'Quentíssimo e o capuz não murcha.' },
    ],
  },
  {
    slug: 'calca-jeans-reta',
    name: 'Calça Jeans Reta',
    description: 'Jeans de algodão com 2% de elastano, modelagem reta e cinco bolsos. Lavagem média.',
    priceCents: 22990,
    compareAtPriceCents: 27990,
    category: 'roupas',
    stock: 7,
    weightGrams: 640,
    reviews: [
      { author: 'Diego M.', rating: 4, comment: 'Boa modelagem, o tecido tem uma leve elasticidade que ajuda.' },
      { author: 'Paula V.', rating: 3, comment: 'Serviu bem, mas o azul é mais claro do que na foto.' },
    ],
  },
  {
    slug: 'tenis-runner',
    name: 'Tênis Runner',
    description:
      'Tênis leve com entressola em EVA e cabedal respirável. Indicado para caminhadas e corridas de até 10 km.',
    priceCents: 24990,
    compareAtPriceCents: 32990,
    category: 'calcados',
    stock: 23,
    weightGrams: 820,
    reviews: [
      { author: 'Bruno L.', rating: 5, comment: 'Uso pra correr 5km três vezes por semana, amortecimento ótimo.' },
      { author: 'Helena K.', rating: 5, comment: 'Leve e não machucou nada no período de adaptação.' },
      { author: 'Igor P.', rating: 4, comment: 'Muito bom, só queria mais opções de cor.' },
    ],
  },
  {
    slug: 'tenis-casual-couro',
    name: 'Tênis Casual de Couro',
    description: 'Couro legítimo, solado de borracha e forro em tecido. Combina com jeans e com social.',
    priceCents: 34990,
    category: 'calcados',
    stock: 11,
    weightGrams: 900,
    reviews: [
      { author: 'Tatiana G.', rating: 5, comment: 'Acabamento muito acima do preço.' },
    ],
  },
  {
    slug: 'chinelo-slide',
    name: 'Chinelo Slide',
    description: 'Slide em EVA injetado, palmilha anatômica e antiderrapante. Leve e à prova d’água.',
    priceCents: 7990,
    category: 'calcados',
    stock: 0,
    weightGrams: 300,
    reviews: [
      { author: 'Lucas F.', rating: 4, comment: 'Confortável, mas escorrega um pouco no piso molhado.' },
    ],
  },
  {
    slug: 'mochila-urbana',
    name: 'Mochila Urbana',
    description:
      'Mochila resistente à água, 22 litros, com compartimento acolchoado para notebook de até 15,6". Costas em espuma ventilada.',
    priceCents: 17990,
    compareAtPriceCents: 21990,
    category: 'acessorios',
    stock: 31,
    weightGrams: 850,
    reviews: [
      { author: 'Vitor A.', rating: 5, comment: 'Levo notebook, carregador e guarda-chuva sem apertar.' },
      { author: 'Sofia B.', rating: 5, comment: 'Peguei chuva forte e nada molhou dentro.' },
    ],
  },
  {
    slug: 'carteira-slim',
    name: 'Carteira Slim',
    description: 'Carteira compacta em couro sintético com bloqueio RFID e espaço para seis cartões.',
    priceCents: 8990,
    category: 'acessorios',
    stock: 55,
    weightGrams: 120,
    reviews: [
      { author: 'Renato C.', rating: 4, comment: 'Cabe o essencial e não deforma o bolso.' },
    ],
  },
  {
    slug: 'oculos-de-sol',
    name: 'Óculos de Sol Polarizado',
    description: 'Lentes polarizadas com proteção UV400 e armação em acetato. Acompanha case rígido.',
    priceCents: 15990,
    category: 'acessorios',
    stock: 14,
    weightGrams: 180,
    reviews: [
      { author: 'Juliana D.', rating: 5, comment: 'A polarização faz diferença real dirigindo.' },
    ],
  },
  {
    slug: 'garrafa-termica',
    name: 'Garrafa Térmica 500ml',
    description:
      'Aço inox com parede dupla a vácuo: mantém a temperatura por até 12 horas. Tampa com vedação de silicone.',
    priceCents: 7990,
    category: 'casa',
    stock: 60,
    weightGrams: 420,
    reviews: [
      { author: 'André N.', rating: 5, comment: 'Café ainda quente depois de 8 horas no trabalho.' },
      { author: 'Bia M.', rating: 4, comment: 'Ótima, mas a boca é estreita para gelo.' },
    ],
  },
  {
    slug: 'jogo-de-toalhas',
    name: 'Jogo de Toalhas',
    description: 'Quatro peças em algodão egípcio 500g/m². Alta absorção e toque macio.',
    priceCents: 12990,
    compareAtPriceCents: 15990,
    category: 'casa',
    stock: 26,
    weightGrams: 1400,
    reviews: [
      { author: 'Cristina O.', rating: 5, comment: 'Absorve muito bem e não soltou fiapo.' },
    ],
  },
  {
    slug: 'fone-bluetooth',
    name: 'Fone Bluetooth',
    description:
      'Fone intra-auricular com cancelamento ativo de ruído, 24 horas de bateria com o estojo e conexão multiponto.',
    priceCents: 29990,
    compareAtPriceCents: 39990,
    category: 'eletronicos',
    stock: 9,
    weightGrams: 260,
    reviews: [
      { author: 'Felipe H.', rating: 5, comment: 'Cancelamento surpreendente para a faixa de preço.' },
      { author: 'Nina Q.', rating: 4, comment: 'Som ótimo, o app poderia ser melhor.' },
      { author: 'Otávio S.', rating: 5, comment: 'A conexão multiponto entre notebook e celular funciona bem.' },
    ],
  },
];

const COUPONS = [
  {
    code: 'BEMVINDO10',
    type: 'percent',
    value: 10,
    description: '10% de desconto na primeira compra',
    minSubtotalCents: 0,
  },
  {
    code: 'FRETEGRATIS',
    type: 'free_shipping',
    value: 0,
    description: 'Frete grátis em pedidos acima de R$ 150',
    minSubtotalCents: 15000,
  },
  {
    code: 'MENOS50',
    type: 'fixed',
    value: 5000,
    description: 'R$ 50 de desconto em pedidos acima de R$ 300',
    minSubtotalCents: 30000,
  },
  {
    code: 'BLACKFRIDAY',
    type: 'percent',
    value: 25,
    description: '25% de desconto em pedidos acima de R$ 400',
    minSubtotalCents: 40000,
  },
];

export async function seed(): Promise<void> {
  await prisma.orderEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.product.deleteMany();
  await prisma.coupon.deleteMany();

  for (const { reviews, ...product } of PRODUCTS) {
    await prisma.product.create({
      data: {
        ...product,
        image: image(product.name),
        compareAtPriceCents: product.compareAtPriceCents ?? null,
        reviews: { create: reviews },
      },
    });
  }

  for (const coupon of COUPONS) {
    await prisma.coupon.create({ data: coupon });
  }
}

async function main(): Promise<void> {
  await seed();
  const products = await prisma.product.count();
  const coupons = await prisma.coupon.count();
  const reviews = await prisma.review.count();
  console.log(`Seed concluído: ${products} produtos, ${reviews} avaliações, ${coupons} cupons.`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Falha no seed:', error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
