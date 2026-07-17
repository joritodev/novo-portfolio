import "./globals.css";
import RefreshRedirect from '@/components/RefreshRedirect'

export const metadata = {
  title: "jorito.dev",
  description: "Portfólio de João Montenegro",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <RefreshRedirect />
        {children}
        </body>
    </html>
  );
}