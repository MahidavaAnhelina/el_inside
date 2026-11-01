import { notFound } from "next/navigation";
import type { ReactNode } from "react";
export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "pl" && locale !== "en") notFound();
  return <html lang={locale}><body>{children}</body></html>;
}
