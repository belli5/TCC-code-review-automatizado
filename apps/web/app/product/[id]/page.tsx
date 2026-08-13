import { AddToCartButton } from './AddToCartButton';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

async function getProduct(id: string): Promise<Product | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${apiUrl}/products/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);

  if (!product) {
    return <div className="empty">Produto não encontrado.</div>;
  }

  return (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
      <img
        src={product.image}
        alt={product.name}
        style={{ width: 320, height: 320, objectFit: 'cover', borderRadius: 12 }}
      />
      <div style={{ flex: 1, minWidth: 260 }}>
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <p className="price" style={{ fontSize: 24 }}>
          {product.price.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}
        </p>
        <AddToCartButton product={product} />
      </div>
    </div>
  );
}
