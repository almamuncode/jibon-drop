import { getLocale, getTranslation } from "@/lib/i18n-server";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Droplet } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { PwaInstall } from "@/components/pwa";
import { AuthNavigation, MobileNavigation } from "@/components/auth-navigation";
import { LanguageProvider, LanguageToggle } from "@/components/language";
import "./site.css";
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const brand = locale === "bn" ? "জীবনড্রপ" : "JibonDrop";
  return {
    applicationName: brand,
    appleWebApp: { capable: true, title: brand, statusBarStyle: "default" },
    icons: {
      icon: "/icons/icon-192.png",
      apple: "/icons/apple-touch-icon.png",
    },
    title: {
      default:
        locale === "bn"
          ? "জীবনড্রপ — বাংলাদেশে রক্তদাতা খুঁজুন"
          : "JibonDrop — Find blood donors in Bangladesh",
      template: `%s · ${brand}`,
    },
    description:
      locale === "bn"
        ? "এক ফোঁটা রক্ত। একটি জীবনের উপহার। বাংলাদেশজুড়ে সম্মত রক্তদাতাদের খুঁজুন এবং যোগাযোগ করুন।"
        : "A drop of blood. A gift of life. Find and contact consenting blood donors across Bangladesh.",
  };
}
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#df0715",
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslation();
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <LanguageProvider locale={locale}>
          <a className="skip" href="#main">
            {t("Skip to content")}{" "}
          </a>
          <header className="site-header">
            <div className="nav-wrap">
              <Link className="wordmark" href="/">
                <span className="brand-icon">
                  <Droplet size={22} strokeWidth={1.8} />
                </span>
                <span className="brand-name">
                  <span lang="en">JibonDrop</span>
                  <small lang="bn">জীবনড্রপ</small>
                </span>
              </Link>
              <nav aria-label={t("Main navigation")}>
                <Link href="/find-donors">{t("Find donors")}</Link>
                <AuthNavigation />
                <LanguageToggle />
                <ThemeToggle />
              </nav>
            </div>
          </header>
          <main id="main">{children}</main>
          <footer>
            <div>
              <Link className="wordmark" href="/">
                {t("Jibon")}
                <span>{t("Drop")}</span>
              </Link>
              <p>{t("A drop of blood. A gift of life.")}</p>
              <PwaInstall />
            </div>
            <div>
              <Link href="/privacy">{t("Privacy & contact guidance")}</Link>
              <p>
                {t("For urgent care, contact your hospital or blood bank.")}
              </p>
              <p>
                {t(
                  "Eligibility must be confirmed by a healthcare professional.",
                )}
              </p>
            </div>
          </footer>
          <MobileNavigation />
        </LanguageProvider>
      </body>
    </html>
  );
}
