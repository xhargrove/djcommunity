import {
  MAX_POST_IMAGE_BYTES,
  MAX_POST_VIDEO_BYTES,
} from "@/lib/posts/constants";

/** Allowed image MIME types for feed post attachments (client + server). */
export const POST_FEED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** Allowed video MIME types for feed post attachments (client + server). */
export const POST_FEED_VIDEO_MIMES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export function classifyPostFeedMedia(mime: string): "image" | "video" | null {
  if (POST_FEED_IMAGE_MIMES.has(mime)) {
    return "image";
  }
  if (POST_FEED_VIDEO_MIMES.has(mime)) {
    return "video";
  }
  return null;
}

export function extensionForPostFeedMime(mime: string): string {
  const kind = classifyPostFeedMedia(mime);
  const mapped = MIME_TO_EXT[mime];
  if (mapped) {
    return mapped;
  }
  return kind === "image" ? "jpg" : "mp4";
}

export function maxBytesForPostFeedKind(kind: "image" | "video"): number {
  return kind === "image" ? MAX_POST_IMAGE_BYTES : MAX_POST_VIDEO_BYTES;
}

export function postFeedFileTooLargeMessage(
  kind: "image" | "video",
): string {
  if (kind === "image") {
    return "Each image must be 8MB or smaller.";
  }
  return `Each video must be ${Math.floor(
    MAX_POST_VIDEO_BYTES / (1024 * 1024),
  )}MB or smaller (typical 2–3 min phone clips fit; very high bitrates may need a shorter file).`;
}

export function validatePostFeedFile(file: File):
  | { ok: true; kind: "image" | "video"; mime: string }
  | { ok: false; error: string } {
  const mime = file.type || "application/octet-stream";
  const kind = classifyPostFeedMedia(mime);
  if (!kind) {
    return {
      ok: false,
      error:
        "Unsupported file type. Use JPG, PNG, WebP, GIF, MP4, WebM, or MOV.",
    };
  }
  if (file.size > maxBytesForPostFeedKind(kind)) {
    return { ok: false, error: postFeedFileTooLargeMessage(kind) };
  }
  return { ok: true, kind, mime };
}

/** `storage_path` after client-side upload: `{userId}/{postId}/{uuid}.{ext}` */
export function isClientPostMediaStoragePath(args: {
  userId: string;
  postId: string;
  storagePath: string;
}): boolean {
  const prefix = `${args.userId}/${args.postId}/`;
  if (!args.storagePath.startsWith(prefix)) {
    return false;
  }
  const tail = args.storagePath.slice(prefix.length);
  if (tail.includes("/") || tail.includes("..")) {
    return false;
  }
  return /^[0-9a-f-]{36}\.[a-z0-9]+$/i.test(tail);
}
