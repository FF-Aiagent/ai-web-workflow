import { NextResponse } from "next/server";
import {
  ExtractError,
  MAX_PASTE_CHARS,
  extractFromText,
  extractFromUrl,
} from "@/lib/extract";

type Body = {
  url?: string;
  text?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_json",
        message: "请求格式错误：请重试，或直接手动填写表单。",
      },
      { status: 400 },
    );
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const text = typeof body.text === "string" ? body.text : "";

  if (!url && !text.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: "empty",
        message: "请粘贴商品链接或详情文本；失败时可直接手动填写下方表单。",
      },
      { status: 400 },
    );
  }

  if (text && [...text].length > MAX_PASTE_CHARS) {
    return NextResponse.json(
      {
        ok: false,
        error: "oversized",
        message: `内容过长（超过 ${MAX_PASTE_CHARS} 字符）：请缩短后再试，或直接手动填写表单。`,
      },
      { status: 400 },
    );
  }

  try {
    const fields = url
      ? await extractFromUrl(url)
      : extractFromText(text);
    return NextResponse.json({ ok: true, fields });
  } catch (err) {
    if (err instanceof ExtractError) {
      const status =
        err.code === "unreachable" || err.code === "bad_url" ? 422 : 400;
      return NextResponse.json(
        { ok: false, error: err.code, message: err.message },
        { status },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: "unreachable",
        message: "抽取失败：请重试，或直接手动填写表单。",
      },
      { status: 422 },
    );
  }
}
