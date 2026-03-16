import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { imageBase64, mediaType } = body;

  if (!imageBase64 || !mediaType) {
    return NextResponse.json({ error: "Image required" }, { status: 400 });
  }

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `Analyse this food image and return ONLY a JSON object with no markdown, no explanation, just raw JSON:
{
  "meal_name": "descriptive name of the food",
  "calories": estimated calories as integer,
  "protein_g": protein in grams as number,
  "carbs_g": carbohydrates in grams as number,
  "fat_g": fat in grams as number,
  "confidence": "high" | "medium" | "low",
  "notes": "brief note on portion assumptions or uncertainty"
}
Base estimates on a standard single serving or the visible portion. If you cannot identify food, return confidence: "low" with best guess.`,
            },
          ],
        },
      ],
    }),
  });

  if (!anthropicRes.ok) {
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }

  const aiData = await anthropicRes.json();
  const rawText = aiData.content?.[0]?.text ?? "";

  let nutrition;
  try {
    nutrition = JSON.parse(rawText.replace(/```json|```/g, "").trim());
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response", raw: rawText }, { status: 500 });
  }

  return NextResponse.json({ ...nutrition, raw_ai_response: rawText });
}

