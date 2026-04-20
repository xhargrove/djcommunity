/**
 * Stored on `posts.media_aspect_ratio` — Instagram-style framing for feed media.
 */
export const MEDIA_ASPECT_RATIOS = ["4_5", "1_1", "9_16"] as const;

export type MediaAspectRatio = (typeof MEDIA_ASPECT_RATIOS)[number];

export const MEDIA_ASPECT_LABELS: Record<MediaAspectRatio, string> = {
  "4_5": "4:5 · Portrait",
  "1_1": "1:1 · Square",
  "9_16": "9:16 · Full vertical",
};

export const DEFAULT_MEDIA_ASPECT_RATIO: MediaAspectRatio = "4_5";

/** Tailwind classes for the media frame (width-full; height from aspect ratio). */
export function mediaAspectFrameClass(ratio: string | null | undefined): string {
  switch (ratio) {
    case "1_1":
      return "aspect-square max-h-[min(92vw,560px)] sm:max-h-[560px]";
    case "9_16":
      return "aspect-[9/16] max-h-[min(92vh,780px)] sm:max-h-[min(85vh,780px)]";
    case "4_5":
    default:
      return "aspect-[4/5] max-h-[min(70vh,560px)] sm:max-h-[560px]";
  }
}
