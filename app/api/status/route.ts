import { NextResponse } from "next/server";

// GET /api/status — tells the client which features are available
// Never exposes the actual key values
export async function GET() {
  return NextResponse.json({
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
  });
}
