import Link from 'next/link';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

async function getProducts(): Promise<Product[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${apiUrl}/products`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Erro ao buscar produtos');
  }
  return res.json();
}

export default async function HomePage() {
  let products: Product[] = [];
  let error = false;

  try {
    products = await getProducts();
  } catch {
    error = true;
  }

  if (error) {
    return (
      <div className="empty">
        <p>
          Não foi possível conectar à API. Verifique se ela está rodando em{' '}
          <code>http://localhost:3001</code> (execute <code>npm run dev:api</code>).
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1>Nossos Produtos</h1>
      <div className="grid">
        {products.map((product) => (
          <Link key={product.id} href={`/product/${product.id}`} className="card">
            <Image
              src={product.image}
              alt={product.name}
              width={400}
              height={400}
              style={{ width: '100%', height: 180, objectFit: 'cover' }}
            />
            <div className="card-body">
              <h3>{product.name}</h3>
              <p className="price">
                {product.price.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
