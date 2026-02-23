import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    keyExists: !!process.env.OPENAI_API_KEY,
    keyPreview: process.env.OPENAI_API_KEY?.slice(0, 10) || "NO KEY",
  });
}