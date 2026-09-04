import Link from 'next/link';
import { api, Category, Product } from '../lib/api';
import { formatCents } from '../lib/format';
import { ProductCard } from '../components/ProductCard';
import { ApiOffline } from '../components/ApiOffline';

interface HomeData {
  categories: Category[];
  featured: Product[];
  onSale: Product[];
  topRated: Product[];
  freeShippingThresholdCents: number;
}

async function getHomeData(): Promise<HomeData | null> {
  try {
    const [categories, recent, topRated, policy] = await Promise.all([
      api.categories(),
      api.products({ pageSize: 8, sort: 'recent' }),
      api.products({ pageSize: 4, sort: 'rating' }),
      api.shippingPolicy(),
    ]);

    return {
      categories,
      featured: recent.items,
      onSale: recent.items.filter((product) => product.discountPercent > 0).slice(0, 4),
      topRated: topRated.items,
      freeShippingThresholdCents: policy.freeShippingThresholdCents,
    };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const data = await getHomeData();

  if (!data) {
    return <ApiOffline />;
  }

  return (
    <div className="home">
      <section className="hero">
        <div>
          <h1>Tudo o que você precisa, em poucos cliques</h1>
          <p>
            Frete grátis em compras acima de{' '}
            <strong>{formatCents(data.freeShippingThresholdCents)}</strong>. Pague com PIX, boleto
            ou cartão em até 12x.
          </p>
          <Link href="/busca" className="button">
            Ver todos os produtos
          </Link>
        </div>
        <ul className="hero-perks">
          <li>
            <strong>Frete grátis</strong>
            <span>Acima de {formatCents(data.freeShippingThresholdCents)}</span>
          </li>
          <li>
            <strong>Até 12x</strong>
            <span>Sem juros no cartão</span>
          </li>
          <li>
            <strong>PIX na hora</strong>
            <span>Confirmação imediata</span>
          </li>
          <li>
            <strong>Rastreio</strong>
            <span>Acompanhe cada etapa</span>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="section-title">Categorias</h2>
        <div className="chips">
          {data.categories.map((category) => (
            <Link
              key={category.slug}
              href={`/busca?category=${category.slug}`}
              className="chip"
            >
              {category.label}
              <span className="chip-count">{category.count}</span>
            </Link>
          ))}
        </div>
      </section>

      {data.onSale.length > 0 && (
        <section>
          <div className="section-header">
            <h2 className="section-title">Em promoção</h2>
            <Link href="/busca?sort=price_asc" className="section-link">
              Ver tudo
            </Link>
          </div>
          <div className="grid">
            {data.onSale.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="section-header">
          <h2 className="section-title">Mais bem avaliados</h2>
          <Link href="/busca?sort=rating" className="section-link">
            Ver tudo
          </Link>
        </div>
        <div className="grid">
          {data.topRated.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section>
        <div className="section-header">
          <h2 className="section-title">Novidades</h2>
          <Link href="/busca" className="section-link">
            Ver tudo
          </Link>
        </div>
        <div className="grid">
          {data.featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
