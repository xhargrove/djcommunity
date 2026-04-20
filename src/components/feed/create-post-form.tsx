"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { createPostAction } from "@/actions/posts";
import { PRODUCT_EVENTS } from "@/lib/analytics/events";
import { trackProductEvent } from "@/lib/analytics/track-client";
import {
  POST_CAROUSEL_MAX_MEDIA,
  POST_TYPE_LABELS,
  POST_TYPES_CREATABLE,
  type CreatablePostType,
} from "@/lib/posts/constants";
import {
  DEFAULT_MEDIA_ASPECT_RATIO,
  MEDIA_ASPECT_LABELS,
  MEDIA_ASPECT_RATIOS,
  mediaAspectFrameClass,
  type MediaAspectRatio,
} from "@/lib/posts/media-aspect";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
    >
      {pending ? "Posting…" : "Post"}
    </button>
  );
}

function previewKindForFile(file: File): "image" | "video" | null {
  if (file.type.startsWith("image/")) {
    return "image";
  }
  if (file.type.startsWith("video/")) {
    return "video";
  }
  return null;
}

export function CreatePostForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(createPostAction, undefined);
  const [caption, setCaption] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [previewKinds, setPreviewKinds] = useState<Array<"image" | "video" | null>>([]);
  const [mediaAspect, setMediaAspect] = useState<MediaAspectRatio>(
    DEFAULT_MEDIA_ASPECT_RATIO,
  );
  const previewUrlsRef = useRef<string[]>([]);
  previewUrlsRef.current = previewUrls;

  function revokePreviews(urls: string[]) {
    urls.forEach((u) => URL.revokeObjectURL(u));
  }

  useEffect(() => {
    if (!state?.ok) {
      return;
    }
    trackProductEvent(PRODUCT_EVENTS.POST_CREATED, { post_id: state.postId });
    formRef.current?.reset();
    setCaption("");
    revokePreviews(previewUrlsRef.current);
    setSelectedFiles([]);
    setPreviewUrls([]);
    setPreviewKinds([]);
    setMediaAspect(DEFAULT_MEDIA_ASPECT_RATIO);
    router.refresh();
  }, [state, router]);

  useEffect(() => {
    return () => {
      revokePreviews(previewUrlsRef.current);
    };
  }, []);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-md shadow-zinc-200/40 ring-1 ring-zinc-100">
      <h2 className="text-sm font-semibold text-zinc-900">Post composer</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Mix clips, flyer drops, event moments, and crate finds — add up to{" "}
        {POST_CAROUSEL_MAX_MEDIA} photos or videos in one carousel (like Instagram).
      </p>
      <form ref={formRef} action={formAction} className="mt-4 space-y-5">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="caption" className="text-xs font-medium text-zinc-600">
              Caption
            </label>
            <span className="text-[11px] tabular-nums text-zinc-600">
              {caption.length}/5000
            </span>
          </div>
          <textarea
            id="caption"
            name="caption"
            required
            rows={4}
            maxLength={5000}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-200"
            placeholder="What set just landed? Drop context for the scene..."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="post_type" className="text-xs font-medium text-zinc-600">
              Post type
            </label>
            <select
              id="post_type"
              name="post_type"
              required
              defaultValue="standard"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-200"
            >
              {POST_TYPES_CREATABLE.map((t: CreatablePostType) => (
                <option key={t} value={t}>
                  {POST_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="media" className="text-xs font-medium text-zinc-600">
              Media (optional)
            </label>
            <input
              id="media"
              name="media"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              onChange={(e) => {
                const list = e.target.files;
                if (!list?.length) {
                  revokePreviews(previewUrls);
                  setSelectedFiles([]);
                  setPreviewUrls([]);
                  setPreviewKinds([]);
                  return;
                }
                const arr = Array.from(list).slice(0, POST_CAROUSEL_MAX_MEDIA);
                revokePreviews(previewUrls);
                setSelectedFiles(arr);
                setPreviewUrls(arr.map((f) => URL.createObjectURL(f)));
                setPreviewKinds(arr.map((f) => previewKindForFile(f)));
              }}
              className="block w-full text-xs text-zinc-600 file:mr-3 file:rounded-full file:border file:border-zinc-200 file:bg-zinc-50 file:px-3 file:py-1.5 file:text-zinc-800 hover:file:bg-zinc-100"
            />
            <p className="text-[11px] text-zinc-600">
              {selectedFiles.length > 0
                ? `${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"} selected · up to ${POST_CAROUSEL_MAX_MEDIA} · JPG/PNG/WebP/GIF ≤8MB · MP4/WebM/MOV ≤50MB each`
                : `Select one or more · carousel up to ${POST_CAROUSEL_MAX_MEDIA} items`}
            </p>
          </div>
        </div>
        {previewUrls.length > 1 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-600">Carousel preview</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {previewUrls.map((url, i) => (
                <div
                  key={url}
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
                >
                  {previewKinds[i] === "image" ? (
                    <Image
                      src={url}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : previewKinds[i] === "video" ? (
                    <video
                      src={url}
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-zinc-500">
                      ?
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="space-y-2">
          <label htmlFor="media_aspect_ratio" className="text-xs font-medium text-zinc-600">
            Media frame
          </label>
          <p className="text-[11px] text-zinc-600">
            How media is cropped in the feed — same presets as Instagram (applies to each slide).
          </p>
          <select
            id="media_aspect_ratio"
            name="media_aspect_ratio"
            value={mediaAspect}
            onChange={(e) => setMediaAspect(e.target.value as MediaAspectRatio)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-200"
          >
            {MEDIA_ASPECT_RATIOS.map((r) => (
              <option key={r} value={r}>
                {MEDIA_ASPECT_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        {previewUrls.length > 0 && previewKinds[0] ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-600">
              {selectedFiles.length > 1 ? "First item preview" : "Preview"}
            </p>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
              {previewKinds[0] === "image" ? (
                <div
                  className={`relative w-full overflow-hidden bg-zinc-100 ${mediaAspectFrameClass(mediaAspect)}`}
                >
                  <Image
                    src={previewUrls[0]}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ) : (
                <div
                  className={`relative w-full overflow-hidden bg-zinc-900 ${mediaAspectFrameClass(mediaAspect)}`}
                >
                  <video
                    src={previewUrls[0]}
                    controls
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-zinc-600">
            Swipe through carousels in the feed. The feed prioritizes visual cards and quick
            identity scanning.
          </p>
          <SubmitButton />
        </div>
        {state && !state.ok ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {state.error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
