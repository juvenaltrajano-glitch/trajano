import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import os from "os";

// POST /api/render
// Accepts composition props, triggers @remotion/renderer, returns { outputUrl }
//
// NOTE: Full server-side rendering requires `@remotion/bundler` (add to deps when ready).
// For the MVP this route stubs the render and returns a placeholder URL.
// To enable real rendering: npm install @remotion/bundler, then uncomment the bundle block below.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // --- REAL RENDER (requires @remotion/bundler) ---
    // const { bundle } = await import("@remotion/bundler");
    // const { renderMedia, selectComposition } = await import("@remotion/renderer");
    //
    // const bundleLocation = await bundle({
    //   entryPoint: path.join(process.cwd(), "remotion/index.ts"),
    //   webpackOverride: (config: unknown) => config,
    // });
    // const composition = await selectComposition({
    //   serveUrl: bundleLocation,
    //   id: "VideoComposition",
    //   inputProps: body,
    // });
    // const outputDir = path.join(os.tmpdir(), "ai-video-editor-renders");
    // fs.mkdirSync(outputDir, { recursive: true });
    // const outputFile = path.join(outputDir, `render-${Date.now()}.mp4`);
    // await renderMedia({
    //   composition,
    //   serveUrl: bundleLocation,
    //   codec: "h264",
    //   outputLocation: outputFile,
    //   inputProps: body,
    // });
    // const publicDir = path.join(process.cwd(), "public", "renders");
    // fs.mkdirSync(publicDir, { recursive: true });
    // const publicFile = path.join(publicDir, path.basename(outputFile));
    // fs.copyFileSync(outputFile, publicFile);
    // return NextResponse.json({ outputUrl: `/renders/${path.basename(outputFile)}` });
    // --- END REAL RENDER ---

    // MVP stub: simulate a short render delay
    await new Promise((r) => setTimeout(r, 1500));

    // Return a reference to the mock video as a stand-in output
    const outputName = `render-${Date.now()}.mp4`;
    return NextResponse.json({ outputUrl: `/mock-video.mp4?as=${outputName}` });
  } catch (err) {
    console.error("[render]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Render failed" },
      { status: 500 }
    );
  }
}
