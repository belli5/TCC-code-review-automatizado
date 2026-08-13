import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '../components/CartContext';
import { Header } from '../components/Header';

export const metadata: Metadata = {
  title: 'Loja Simples',
  description: 'E-commerce simples com Next.js e NestJS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <CartProvider>
          <Header />
          <main className="container">{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
