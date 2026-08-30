import Link from 'next/link';
import Image from 'next/image';
import { Product } from '../lib/api';
import { formatCents } from '../lib/format';
import { Stars } from './Stars';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.slug}`} className="card">
      <div className="card-media">
        <Image
          src={product.image}
          alt={product.name}
          width={400}
          height={400}
          className="card-image"
        />
        {product.discountPercent > 0 && (
          <span className="badge badge-discount">-{product.discountPercent}%</span>
        )}
        {!product.inStock && <span className="badge badge-soldout">Esgotado</span>}
      </div>

      <div className="card-body">
        <span className="card-category">{product.categoryLabel}</span>
        <h3 className="card-title">{product.name}</h3>

        {product.reviewsCount > 0 ? (
          <Stars rating={product.rating} showValue count={product.reviewsCount} />
        ) : (
          <span className="card-no-reviews">Sem avaliações</span>
        )}

        <div className="card-price">
          {product.compareAtPriceCents && (
            <span className="price-old">{formatCents(product.compareAtPriceCents)}</span>
          )}
          <span className="price">{formatCents(product.priceCents)}</span>
        </div>

        {product.inStock && product.stock <= 10 && (
          <span className="card-lowstock">Restam {product.stock} unidades</span>
        )}
      </div>
    </Link>
  );
}
