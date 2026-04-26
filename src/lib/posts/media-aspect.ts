/**
 * Stored on `posts.media_aspect_ratio` — feed framing: portrait/square/vertical
 * (Instagram-style) plus 16:9 for YouTube-style landscape clips.
 */
/** Display order in the composer: portrait → square → YouTube landscape → full vertical. */
export const MEDIA_ASPECT_RATIOS = ["4_5", "1_1", "16_9", "9_16"] as const;

export type MediaAspectRatio = (typeof MEDIA_ASPECT_RATIOS)[number];

export const MEDIA_ASPECT_LABELS: Record<MediaAspectRatio, string> = {
  "4_5": "4:5 · Portrait",
  "1_1": "1:1 · Square",
  "9_16": "9:16 · Full vertical",
  "16_9": "16:9 · YouTube (landscape)",
};

/** Compact labels for the feed “View” toggle chips. */
export const MEDIA_ASPECT_SHORT_LABELS: Record<MediaAspectRatio, string> = {
  "4_5": "4:5",
  "1_1": "1:1",
  "9_16": "9:16",
  "16_9": "16:9",
};

export const DEFAULT_MEDIA_ASPECT_RATIO: MediaAspectRatio = "4_5";

/** Tailwind classes for the media frame (width-full; height from aspect ratio). */
export function mediaAspectFrameClass(ratio: string | null | undefined): string {
  switch (ratio) {
    case "1_1":
      return "aspect-square max-h-[min(92vw,560px)] sm:max-h-[560px]";
    case "9_16":
      return "aspect-[9/16] max-h-[min(92vh,780px)] sm:max-h-[min(85vh,780px)]";
    case "16_9":
      return "aspect-video max-h-[min(75vh,720px)] sm:max-h-[min(80vh,720px)]";
    case "4_5":
    default:
      return "aspect-[4/5] max-h-[min(70vh,560px)] sm:max-h-[560px]";
  }
}
