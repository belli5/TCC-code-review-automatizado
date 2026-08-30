import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CATEGORIES, categoryLabel } from '../common/categories';
import {
  CategoryView,
  Paginated,
  ProductDetailView,
  ProductView,
  ReviewView,
} from './product.entity';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateReviewDto } from './dto/create-review.dto';

const DEFAULT_PAGE_SIZE = 12;

const WITH_RATINGS = { reviews: { select: { rating: true } } } as const;

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  image: string;
  category: string;
  stock: number;
  weightGrams: number;
  reviews: { rating: number }[];
}

function averageRating(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((total, rating) => total + rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

function discountPercent(priceCents: number, compareAtPriceCents: number | null): number {
  if (!compareAtPriceCents || compareAtPriceCents <= priceCents) return 0;
  return Math.round(((compareAtPriceCents - priceCents) / compareAtPriceCents) * 100);
}

export function toProductView(row: ProductRow): ProductView {
  const ratings = row.reviews.map((review) => review.rating);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceCents: row.priceCents,
    compareAtPriceCents: row.compareAtPriceCents,
    discountPercent: discountPercent(row.priceCents, row.compareAtPriceCents),
    image: row.image,
    category: row.category,
    categoryLabel: categoryLabel(row.category),
    stock: row.stock,
    inStock: row.stock > 0,
    weightGrams: row.weightGrams,
    rating: averageRating(ratings),
    reviewsCount: ratings.length,
  };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProductsDto): Promise<Paginated<ProductView>> {
    const where = this.buildWhere(query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const sort = query.sort ?? 'recent';

    if (sort === 'rating') {
      const rows = (await this.prisma.product.findMany({
        where,
        include: WITH_RATINGS,
      })) as ProductRow[];
      const ranked = rows
        .map(toProductView)
        .sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount);
      return this.paginateInMemory(ranked, page, pageSize);
    }

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: WITH_RATINGS,
        orderBy: this.buildOrderBy(sort),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }) as Promise<ProductRow[]>,
      this.prisma.product.count({ where }),
    ]);

    return {
      items: rows.map(toProductView),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async findOne(idOrSlug: string): Promise<ProductDetailView> {
    const row = await this.prisma.product.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: { reviews: { orderBy: { createdAt: 'desc' } } },
    });

    if (!row) {
      throw new NotFoundException(`Produto "${idOrSlug}" não encontrado`);
    }

    const reviews: ReviewView[] = row.reviews.map((review) => ({
      id: review.id,
      author: review.author,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
    }));

    const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const review of reviews) {
      const star = Math.min(5, Math.max(1, review.rating)) as 1 | 2 | 3 | 4 | 5;
      breakdown[star] += 1;
    }

    return {
      ...toProductView({ ...row, reviews: row.reviews }),
      reviews,
      ratingBreakdown: breakdown,
    };
  }

  async createReview(productId: string, dto: CreateReviewDto): Promise<ReviewView> {
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id: productId }, { slug: productId }] },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException(`Produto "${productId}" não encontrado`);
    }

    const review = await this.prisma.review.create({
      data: {
        productId: product.id,
        author: dto.author.trim(),
        rating: dto.rating,
        comment: dto.comment.trim(),
      },
    });

    return {
      id: review.id,
      author: review.author,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
    };
  }

  async findCategories(): Promise<CategoryView[]> {
    const grouped = await this.prisma.product.groupBy({
      by: ['category'],
      where: { active: true },
      _count: { _all: true },
    });

    const counts = new Map(grouped.map((row) => [row.category, row._count._all]));

    return CATEGORIES.map((category) => ({
      slug: category.slug,
      label: category.label,
      count: counts.get(category.slug) ?? 0,
    })).filter((category) => category.count > 0);
  }

  async findPriceRange(): Promise<{ minCents: number; maxCents: number }> {
    const result = await this.prisma.product.aggregate({
      where: { active: true },
      _min: { priceCents: true },
      _max: { priceCents: true },
    });
    return {
      minCents: result._min.priceCents ?? 0,
      maxCents: result._max.priceCents ?? 0,
    };
  }

  private buildWhere(query: QueryProductsDto) {
    const where: Record<string, unknown> = { active: true };

    if (query.category) {
      where.category = query.category;
    }

    if (query.inStock) {
      where.stock = { gt: 0 };
    }

    if (query.minPriceCents !== undefined || query.maxPriceCents !== undefined) {
      where.priceCents = {
        ...(query.minPriceCents !== undefined ? { gte: query.minPriceCents } : {}),
        ...(query.maxPriceCents !== undefined ? { lte: query.maxPriceCents } : {}),
      };
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [{ name: { contains: search } }, { description: { contains: search } }];
    }

    return where;
  }

  private buildOrderBy(sort: string) {
    switch (sort) {
      case 'price_asc':
        return { priceCents: 'asc' as const };
      case 'price_desc':
        return { priceCents: 'desc' as const };
      case 'name':
        return { name: 'asc' as const };
      default:
        return { createdAt: 'desc' as const };
    }
  }

  private paginateInMemory<T>(items: T[], page: number, pageSize: number): Paginated<T> {
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      page,
      pageSize,
      total: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
    };
  }
}
