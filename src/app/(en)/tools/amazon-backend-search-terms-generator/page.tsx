import type { Metadata } from "next";
import { BackendTermsTool } from "./BackendTermsTool";

const URL =
  "https://ai-web-workflow.vercel.app/tools/amazon-backend-search-terms-generator";

export const metadata: Metadata = {
  title: "Amazon Backend Search Terms Generator (Free)",
  description:
    "Paste your product info and get backend search terms that fit Amazon's byte limit, ready to copy. Free, no signup for your first try.",
  alternates: { canonical: URL },
};

export default function Page() {
  return (
    <>
      <h1>Generate Amazon Backend Search Terms</h1>
      <BackendTermsTool />

      <section className="card">
        <h2>How to use it in 3 steps</h2>
        <ol>
          <li>Paste your product name and key features (category is optional).</li>
          <li>Click <strong>Generate</strong>. Duplicate words are removed and the result is kept under 249 bytes.</li>
          <li>Copy the terms into Seller Central → Edit listing → Keywords → Search Terms.</li>
        </ol>
      </section>

      <section className="card">
        <h2>Checklist before you save</h2>
        <ul>
          <li>☐ Don&apos;t repeat words already in your product title.</li>
          <li>☐ No competitor brand names or ASINs.</li>
          <li>☐ Stay within the byte limit (under 250 bytes for Amazon US; we cap at 249).</li>
          <li>☐ Separate words with spaces; no commas needed.</li>
        </ul>
      </section>

      <section className="card">
        <h2>Common pitfalls</h2>
        <ul>
          <li><strong>Counting characters, not bytes.</strong> Accented or non-Latin characters take 2–3 bytes each, so a field can look short and still be over.</li>
          <li><strong>Going over the limit.</strong> If the field is over, Amazon may ignore the whole field, not just the extra words.</li>
          <li><strong>Stuffing repeats and plurals.</strong> Repeating words or adding every variation wastes bytes and doesn&apos;t help.</li>
          <li><strong>Subjective or misleading terms.</strong> Words like &quot;best&quot;, &quot;cheap&quot; or unrelated popular keywords don&apos;t belong here.</li>
        </ul>
      </section>
    </>
  );
}
