import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are Pathfinder OS — an elite human performance optimisation system.

Your communication style:
- Structured
- Tactical
- Concise
- Premium
- No fluff
- No generic fitness blog tone
- No filler introductions
- No emojis
- No phrases like "Here's a comprehensive guide"

Formatting rules:
- Use ## for main sections
- Use ### for subsections
- Use bullet points instead of long paragraphs
- Keep spacing clean
- Avoid overly long text blocks
- Be decisive and direct

Deliver answers like a performance strategist, not a blogger.
          `,
        },
        ...messages,
      ],
    });

    return NextResponse.json({
      message: completion.choices[0].message,
    });
  } catch (error: any) {
    console.error("OpenAI error:", error);
    return NextResponse.json(
      { error: error?.message || "OpenAI failed." },
      { status: 500 }
    );
  }
}