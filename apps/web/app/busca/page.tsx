import Link from 'next/link';
import { Suspense } from 'react';
import { api } from '../../lib/api';
import { ProductCard } from '../../components/ProductCard';
import { ProductFilters } from '../../components/ProductFilters';
import { ApiOffline } from '../../components/ApiOffline';

interface SearchParams {
  search?: string;
  category?: string;
  sort?: string;
  inStock?: string;
  maxPriceCents?: string;
  page?: string;
}

function pageHref(params: SearchParams, page: number): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  next.set('page', String(page));
  return `/busca?${next.toString()}`;
}

// No Next 15 `searchParams` deixou de ser um objeto sincrono e virou Promise:
// a rota pode comecar a renderizar antes de os parametros serem conhecidos.
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = await searchParams;
  const page = Number(filters.page ?? '1') || 1;

  let data;
  let categories;
  try {
    [data, categories] = await Promise.all([
      api.products({
        search: filters.search,
        category: filters.category,
        sort: filters.sort,
        inStock: filters.inStock === 'true' ? true : undefined,
        maxPriceCents: filters.maxPriceCents ? Number(filters.maxPriceCents) : undefined,
        page,
        pageSize: 9,
      }),
      api.categories(),
    ]);
  } catch {
    return <ApiOffline />;
  }

  const title = filters.search
    ? `Resultados para "${filters.search}"`
    : (categories.find((c) => c.slug === filters.category)?.label ?? 'Todos os produtos');

  return (
    <div className="search-layout">
      <Suspense fallback={<aside className="filters" />}>
        <ProductFilters categories={categories} />
      </Suspense>

      <div>
        <div className="section-header">
          <h1 className="section-title">{title}</h1>
          <span className="muted">
            {data.total} {data.total === 1 ? 'produto' : 'produtos'}
          </span>
        </div>

        {data.items.length === 0 ? (
          <div className="empty">
            <p>Nenhum produto encontrado com esses filtros.</p>
            <Link href="/busca" className="button">
              Limpar filtros
            </Link>
          </div>
        ) : (
          <>
            <div className="grid">
              {data.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {data.totalPages > 1 && (
              <nav className="pagination" aria-label="Paginação">
                {Array.from({ length: data.totalPages }, (_, index) => index + 1).map((n) => (
                  <Link
                    key={n}
                    href={pageHref(filters, n)}
                    className={n === data.page ? 'page-link is-active' : 'page-link'}
                  >
                    {n}
                  </Link>
                ))}
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
