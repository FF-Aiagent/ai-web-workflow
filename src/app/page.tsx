import { WorkflowForm } from "@/components/WorkflowForm";

export default function HomePage() {
  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        免费主路径：匿名 1 次；启用本机 ID 后共 3 次。额度用尽进入付费墙占位（不扣款）。
      </p>
      <WorkflowForm />
    </>
  );
}
