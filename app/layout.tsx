import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'TopRepet — частные репетиторы · ОГЭ и ЕГЭ по информатике', description: 'Разобраться в школьной программе и спокойно подготовиться к экзаменам. Частные репетиторы TopRepet: 1 200 ₽ за 60 минут. Первое короткое знакомство бесплатно.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="ru"><body>{children}</body></html>; }
