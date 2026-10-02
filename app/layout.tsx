import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "JibonDrop — Find blood donors in Bangladesh",
    template: "%s · JibonDrop",
  },
  description:
    "A drop of blood. A gift of life. Find and contact consenting blood donors across Bangladesh.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header>
          <div className="nav-wrap">
            <Link className="wordmark" href="/">
              Jibon<span>Drop</span>
              <small lang="bn">জীবনড্রপ</small>
            </Link>
            <nav aria-label="Main navigation">
              <Link href="/find-donors">Find Blood</Link>
              <Link className="nav-donor" href="/register">
                Become a Donor
              </Link>
              <Link href="/login">Login</Link>
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
          </div>
          <div>
            <Link href="/privacy">Privacy & contact guidance</Link>
            <p>For urgent care, contact your hospital or blood bank.</p>
            <p>Eligibility must be confirmed by a healthcare professional.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
