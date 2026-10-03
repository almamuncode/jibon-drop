import { getLocale, getTranslation } from "@/lib/i18n-server";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Image from "next/image";
import { SocialIcon } from "@/components/social-icon";
import { PwaInstall } from "@/components/pwa";
import { AuthNavigation, MobileNavigation } from "@/components/auth-navigation";
import { LanguageProvider } from "@/components/language";
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
  const socials = [
    {
      label: "Facebook",
      url:
        process.env.NEXT_PUBLIC_FACEBOOK_URL ||
        "https://www.facebook.com/jibondropapp",
      icon: "Facebook" as const,
    },
    {
      label: "Instagram",
      url: process.env.NEXT_PUBLIC_INSTAGRAM_URL,
      icon: "Instagram" as const,
    },
    {
      label: "YouTube",
      url: process.env.NEXT_PUBLIC_YOUTUBE_URL,
      icon: "YouTube" as const,
    },
    {
      label: "LinkedIn",
      url: process.env.NEXT_PUBLIC_LINKEDIN_URL,
      icon: "LinkedIn" as const,
    },
  ].filter((item) => item.url && /^https:\/\//.test(item.url));

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
                <span className="brand-logo" aria-hidden="true">
                  <Image
                    className="brand-logo-original"
                    src="/icons/logo.png"
                    alt=""
                    width={706}
                    height={981}
                    sizes="36px"
                  />
                  <Image
                    className="brand-logo-white"
                    src="/icons/logo-white.png"
                    alt=""
                    width={707}
                    height={981}
                    sizes="36px"
                  />
                </span>
                <span className="brand-name">
                  <span lang="en">JibonDrop</span>
                  <small lang="bn">জীবনড্রপ</small>
                </span>
              </Link>
              <nav aria-label={t("Main navigation")}>
                <Link href="/find-donors">{t("Find donors")}</Link>
                <AuthNavigation />
              </nav>
            </div>
          </header>
          <main id="main">{children}</main>
          <footer>
            <div>
              <Link className="wordmark footer-wordmark" href="/">
                <span className="brand-logo" aria-hidden="true">
                  <Image
                    className="brand-logo-original"
                    src="/icons/logo.png"
                    alt=""
                    width={706}
                    height={981}
                    sizes="36px"
                  />
                  <Image
                    className="brand-logo-white"
                    src="/icons/logo-white.png"
                    alt=""
                    width={707}
                    height={981}
                    sizes="36px"
                  />
                </span>
                <span className="footer-brand-name">
                  {t("Jibon")}
                  <span>{t("Drop")}</span>
                </span>
              </Link>
              <p>{t("A drop of blood. A gift of life.")}</p>
              <PwaInstall />
              {socials.length > 0 && (
                <div className="footer-socials" aria-label={t("Social media")}>
                  {socials.map(({ label, url, icon }) => (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                    >
                      <SocialIcon platform={icon} />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div>
              <nav className="footer-links" aria-label={t("Helpful links")}>
                <Link href="/about">{t("About Us")}</Link>
                <Link href="/privacy">{t("Privacy")}</Link>
                <Link href="/guide">{t("User Guide")}</Link>
                <Link href="/team">{t("Team")}</Link>
              </nav>
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
