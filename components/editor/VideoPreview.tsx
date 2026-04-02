"use client";

// VideoPreview delegates to NativeVideoPreview which uses native <video> elements
// for reliable blob: URL playback (Remotion's <Video> has issues with blob: URLs
// in the browser Player — native elements work as proven by ClipManager thumbnails).
export { NativeVideoPreview as VideoPreview } from "./NativeVideoPreview";
