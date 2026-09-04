import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '../components/CartContext';
import { Header } from '../components/Header';

export const metadata: Metadata = {
  title: 'Loja Simples',
  description:
    'E-commerce completo com Next.js e NestJS: catálogo, carrinho, cupom, frete, pagamento fictício e acompanhamento de pedido.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <CartProvider>
          <Header />
          <main className="container">{children}</main>
          <footer className="site-footer">
            <div className="container">
              <p>
                Loja Simples — projeto de demonstração. Pagamentos, PIX e boletos são
                fictícios e nenhuma cobrança real é feita.
              </p>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
