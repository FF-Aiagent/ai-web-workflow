import { WorkflowForm } from "@/components/WorkflowForm";

export default function HomePage() {
  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        匿名可试 1 次；登录（邮箱 Magic Link）送 10 次账户额度。额度用尽请登录或联系人工加余额（无支付）。
      </p>
      <WorkflowForm />
    </>
  );
}
