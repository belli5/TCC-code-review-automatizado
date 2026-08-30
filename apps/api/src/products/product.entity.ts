export interface ProductView {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  discountPercent: number;
  image: string;
  category: string;
  categoryLabel: string;
  stock: number;
  inStock: boolean;
  weightGrams: number;
  rating: number;
  reviewsCount: number;
}

export interface ReviewView {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ProductDetailView extends ProductView {
  reviews: ReviewView[];
  ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CategoryView {
  slug: string;
  label: string;
  count: number;
}
