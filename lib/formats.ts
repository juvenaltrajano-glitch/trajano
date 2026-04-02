import { VideoFormat, FormatId } from "./types";

export const VIDEO_FORMATS: Record<FormatId, VideoFormat> = {
  vertical: {
    id: "vertical",
    label: "Vertical",
    sublabel: "TikTok · Reels · Shorts",
    width: 1080,
    height: 1920,
    aspectRatio: "9/16",
    icon: "📱",
  },
  portrait: {
    id: "portrait",
    label: "Portrait",
    sublabel: "Instagram Story",
    width: 1080,
    height: 1350,
    aspectRatio: "4/5",
    icon: "🖼️",
  },
  square: {
    id: "square",
    label: "Square",
    sublabel: "Instagram Feed",
    width: 1080,
    height: 1080,
    aspectRatio: "1/1",
    icon: "⬜",
  },
  landscape: {
    id: "landscape",
    label: "Landscape",
    sublabel: "YouTube · Twitter",
    width: 1920,
    height: 1080,
    aspectRatio: "16/9",
    icon: "🖥️",
  },
};

export const DEFAULT_FORMAT = VIDEO_FORMATS.vertical;
