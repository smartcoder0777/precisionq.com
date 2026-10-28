import { NextResponse } from "next/server";
import { surveyController } from "@/controllers/survey.controller";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query") ?? "";
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20");
  const { status, body } = await surveyController.listRecipients({ query, page, pageSize });
  return NextResponse.json(body, { status });
}
