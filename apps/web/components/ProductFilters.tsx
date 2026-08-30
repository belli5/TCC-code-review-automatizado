'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Category } from '../lib/api';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'rating', label: 'Melhor avaliados' },
  { value: 'name', label: 'Nome (A-Z)' },
];

export function ProductFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [maxPrice, setMaxPrice] = useState(params.get('maxPriceCents') ?? '');

  function apply(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    next.delete('page');
    router.push(`/busca?${next.toString()}`);
  }

  const activeCategory = params.get('category') ?? '';
  const activeSort = params.get('sort') ?? 'recent';
  const inStockOnly = params.get('inStock') === 'true';

  return (
    <aside className="filters">
      <div className="filter-group">
        <h3>Categoria</h3>
        <ul className="filter-list">
          <li>
            <button
              type="button"
              className={activeCategory === '' ? 'filter-option is-active' : 'filter-option'}
              onClick={() => apply({ category: null })}
            >
              Todas
            </button>
          </li>
          {categories.map((category) => (
            <li key={category.slug}>
              <button
                type="button"
                className={
                  activeCategory === category.slug ? 'filter-option is-active' : 'filter-option'
                }
                onClick={() => apply({ category: category.slug })}
              >
                {category.label}
                <span className="filter-count">{category.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="filter-group">
        <h3>Ordenar por</h3>
        <select
          value={activeSort}
          onChange={(event) => apply({ sort: event.target.value })}
          aria-label="Ordenar por"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <h3>Preço máximo</h3>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const reais = Number(maxPrice);
            apply({
              maxPriceCents: Number.isFinite(reais) && reais > 0 ? String(Math.round(reais * 100)) : null,
            });
          }}
        >
          <div className="input-prefix">
            <span>R$</span>
            <input
              type="number"
              min={0}
              step={10}
              placeholder="Sem limite"
              value={maxPrice ? String(Number(maxPrice) / 100) : ''}
              onChange={(event) =>
                setMaxPrice(event.target.value ? String(Number(event.target.value) * 100) : '')
              }
              aria-label="Preço máximo em reais"
            />
          </div>
          <button type="submit" className="button-secondary filter-apply">
            Aplicar
          </button>
        </form>
      </div>

      <div className="filter-group">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(event) => apply({ inStock: event.target.checked ? 'true' : null })}
          />
          Somente em estoque
        </label>
      </div>

      <button type="button" className="button-ghost" onClick={() => router.push('/busca')}>
        Limpar filtros
      </button>
    </aside>
  );
}
