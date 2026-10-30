import './globals.css';
import SW from './sw-register';
export const metadata = {
  title: 'Us',
  description: 'Our private space',
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'Us', statusBarStyle: 'default' as const },
};
export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, themeColor: '#f43f5e' };
export default function L({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><SW /><div className="max-w-md mx-auto min-h-screen pb-20 px-4 pt-6">{children}</div></body></html>;
}