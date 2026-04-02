import { NextRequest, NextResponse } from "next/server";
import { parseSuggestions, SuggestRequest } from "@/lib/aiSuggestions";

// POST /api/suggest
// If ANTHROPIC_API_KEY is set → calls Claude for real suggestions
// Otherwise → returns a mock 501 so the client falls back to local mock
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Signal the client to use its local mock instead
    return NextResponse.json(
      { error: "no_api_key", message: "Set ANTHROPIC_API_KEY in .env.local to enable AI suggestions." },
      { status: 501 }
    );
  }

  try {
    const body: SuggestRequest = await req.json();

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const anthropic = new Anthropic({ apiKey });

    const clipsContext = body.clips
      .map(
        (c, i) =>
          `Clip ${i + 1}: "${c.name}" — ${c.duration.toFixed(1)}s original, ` +
          `${c.keptDuration.toFixed(1)}s kept, ${c.segmentCount} kept segments. ` +
          (c.captionSamples.length
            ? `Sample captions: ${c.captionSamples.map((s) => `"${s}"`).join(", ")}.`
            : "No captions yet.")
      )
      .join("\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are an expert video editor assistant. Analyse these video clips and return editing suggestions as a JSON array.

Output format (JSON array only, no markdown):
[
  {
    "kind": "hook" | "reorder" | "transition" | "remove" | "caption" | "pacing",
    "priority": "high" | "medium" | "low",
    "title": "short title",
    "description": "actionable description in 1-2 sentences",
    "clipId": "clip id if relevant",
    "suggestedTransition": "fade|slide-left|slide-right|wipe|flip|clock-wipe|none if kind=transition",
    "suggestedOrder": ["clip-id-1", "clip-id-2"] // only if kind=reorder
  }
]

Project details:
- Output format: ${body.format}
- Caption style: ${body.preset}
- Total clips: ${body.clips.length}

Clips:
${clipsContext}

Return max 5 suggestions. Focus on what will most improve viewer retention for ${body.format} (short-form social video).`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "[]";
    // Strip possible markdown code blocks
    const jsonText = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonText);
    const suggestions = parseSuggestions(parsed);

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[suggest]", err);
    return NextResponse.json(
      { error: "claude_error", message: err instanceof Error ? err.message : "Claude API error" },
      { status: 500 }
    );
  }
}
