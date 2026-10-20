import type { Metadata } from "next";
import Link from "next/link";
import { WorkflowForm } from "@/components/WorkflowForm";

export const metadata: Metadata = {
  alternates: { canonical: "https://ai-web-workflow.vercel.app/" },
};

export default function HomePage() {
  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        匿名可试 1 次；登录（邮箱 Magic Link）送 10 次账户额度。额度用尽请登录或联系人工加余额（无支付）。
      </p>
      <p lang="en">
        <Link href="/tools/amazon-backend-search-terms-generator">
          Free Amazon Backend Search Terms Generator →
        </Link>
      </p>
      <WorkflowForm />
    </>
  );
}
