import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Droplet } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { PwaInstall } from "@/components/pwa";
import { AuthNavigation, MobileNavigation } from "@/components/auth-navigation";
import "./site.css";
export const metadata: Metadata = {
  applicationName: "JibonDrop",
  appleWebApp: { capable: true, title: "JibonDrop", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  title: {
    default: "JibonDrop — Find blood donors in Bangladesh",
    template: "%s · JibonDrop",
  },
  description:
    "A drop of blood. A gift of life. Find and contact consenting blood donors across Bangladesh.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#df0715",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="nav-wrap">
            <Link className="wordmark" href="/">
              <span className="brand-icon">
                <Droplet size={22} strokeWidth={1.8} />
              </span>
              <span className="brand-name">
                JibonDrop<small lang="bn">জীবনড্রপ</small>
              </span>
            </Link>
            <nav aria-label="Main navigation">
              <Link href="/find-donors">Find donors</Link>
              <AuthNavigation />
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer>
          <div>
            <Link className="wordmark" href="/">
              Jibon<span>Drop</span>
            </Link>
            <p>A drop of blood. A gift of life.</p>
            <PwaInstall />
          </div>
          <div>
            <Link href="/privacy">Privacy & contact guidance</Link>
            <p>For urgent care, contact your hospital or blood bank.</p>
            <p>Eligibility must be confirmed by a healthcare professional.</p>
          </div>
        </footer>
        <MobileNavigation />
      </body>
    </html>
  );
}
