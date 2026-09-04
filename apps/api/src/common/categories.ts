export const CATEGORIES = [
  { slug: 'roupas', label: 'Roupas' },
  { slug: 'calcados', label: 'Calçados' },
  { slug: 'acessorios', label: 'Acessórios' },
  { slug: 'casa', label: 'Casa' },
  { slug: 'eletronicos', label: 'Eletrônicos' },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export function isCategorySlug(value: string): value is CategorySlug {
  return CATEGORIES.some((category) => category.slug === value);
}

export function categoryLabel(slug: string): string {
  return CATEGORIES.find((category) => category.slug === slug)?.label ?? slug;
}
