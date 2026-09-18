import Image from 'next/image';
import Link from 'next/link';
import { api, ProductDetail } from '../../../lib/api';
import { formatCents, formatDate } from '../../../lib/format';
import { Stars } from '../../../components/Stars';
import { AddToCartButton } from './AddToCartButton';
import { ShippingSimulator } from './ShippingSimulator';
import { ReviewForm } from './ReviewForm';

async function getProduct(idOrSlug: string): Promise<ProductDetail | null> {
  try {
    return await api.product(idOrSlug);
  } catch {
    return null;
  }
}

// No Next 15 `params` virou Promise, como `searchParams`.
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return (
      <div className="empty">
        <h2>Produto não encontrado</h2>
        <Link href="/busca" className="button">
          Ver catálogo
        </Link>
      </div>
    );
  }

  const maxBreakdown = Math.max(
    1,
    ...Object.values(product.ratingBreakdown).map((value) => Number(value)),
  );

  return (
    <article className="product-page">
      <nav className="breadcrumb">
        <Link href="/">Início</Link>
        <span>/</span>
        <Link href={`/busca?category=${product.category}`}>{product.categoryLabel}</Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>

      <div className="product-main">
        <div className="product-gallery">
          <Image
            src={product.image}
            alt={product.name}
            width={520}
            height={520}
            className="product-image"
            priority
          />
          {product.discountPercent > 0 && (
            <span className="badge badge-discount">-{product.discountPercent}%</span>
          )}
        </div>

        <div className="product-info">
          <h1>{product.name}</h1>

          <div className="product-rating">
            <Stars rating={product.rating} showValue count={product.reviewsCount} size={18} />
          </div>

          <div className="product-price">
            {product.compareAtPriceCents && (
              <span className="price-old">{formatCents(product.compareAtPriceCents)}</span>
            )}
            <span className="price price-large">{formatCents(product.priceCents)}</span>
            {product.discountPercent > 0 && (
              <span className="save-tag">
                Economize {formatCents(product.compareAtPriceCents! - product.priceCents)}
              </span>
            )}
          </div>

          <p className="product-description">{product.description}</p>

          <p className={product.inStock ? 'stock-ok' : 'stock-out'}>
            {product.inStock
              ? `${product.stock} unidade(s) em estoque`
              : 'Produto esgotado'}
          </p>

          <AddToCartButton
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              image: product.image,
              priceCents: product.priceCents,
              stock: product.stock,
            }}
          />

          <ShippingSimulator productId={product.id} />
        </div>
      </div>

      <section className="reviews">
        <div className="section-header">
          <h2 className="section-title">Avaliações ({product.reviewsCount})</h2>
          <ReviewForm productId={product.id} />
        </div>

        {product.reviewsCount > 0 && (
          <div className="reviews-summary">
            <div className="reviews-average">
              <strong>{product.rating.toFixed(1)}</strong>
              <Stars rating={product.rating} size={18} />
              <span className="muted">{product.reviewsCount} avaliações</span>
            </div>
            <div className="reviews-breakdown">
              {[5, 4, 3, 2, 1].map((star) => {
                const value = Number(product.ratingBreakdown[String(star)] ?? 0);
                return (
                  <div key={star} className="breakdown-row">
                    <span>{star}★</span>
                    <div className="breakdown-bar">
                      <div style={{ width: `${(value / maxBreakdown) * 100}%` }} />
                    </div>
                    <span className="muted">{value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {product.reviews.length === 0 ? (
          <p className="muted">Este produto ainda não tem avaliações. Seja o primeiro.</p>
        ) : (
          <ul className="review-list">
            {product.reviews.map((review) => (
              <li key={review.id} className="review">
                <div className="review-head">
                  <strong>{review.author}</strong>
                  <Stars rating={review.rating} />
                  <time className="muted">{formatDate(review.createdAt)}</time>
                </div>
                <p>{review.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
