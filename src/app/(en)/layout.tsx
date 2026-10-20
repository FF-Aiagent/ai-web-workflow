import Link from "next/link";
import "../globals.css";

export default function EnRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="site-header">
            <div className="site-header-row">
              <div>
                <Link href="/" className="linkish">AI Listing Workflow</Link>
              </div>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
