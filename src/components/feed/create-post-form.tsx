"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";

import {
  attachPostMediaAfterClientUploadAction,
  createPostAction,
} from "@/actions/posts";
import { PRODUCT_EVENTS } from "@/lib/analytics/events";
import { trackProductEvent } from "@/lib/analytics/track-client";
import {
  MAX_POST_IMAGE_BYTES,
  MAX_POST_VIDEO_BYTES,
  POST_CAROUSEL_MAX_MEDIA,
  POST_TYPE_LABELS,
  POST_TYPES_CREATABLE,
  type CreatablePostType,
} from "@/lib/posts/constants";
import {
  extensionForPostFeedMime,
  validatePostFeedFile,
} from "@/lib/posts/media-upload-rules";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  DEFAULT_MEDIA_ASPECT_RATIO,
  MEDIA_ASPECT_LABELS,
  MEDIA_ASPECT_RATIOS,
  mediaAspectFrameClass,
  type MediaAspectRatio,
} from "@/lib/posts/media-aspect";

const POST_IMAGE_MAX_MB = Math.floor(MAX_POST_IMAGE_BYTES / (1024 * 1024));
const POST_VIDEO_MAX_MB = Math.floor(MAX_POST_VIDEO_BYTES / (1024 * 1024));

function SubmitButton({ pending }: { pending: boolean }) {
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

async function cleanupDraftPost(
  postId: string,
  uploadedStoragePaths: string[],
): Promise<void> {
  const supabase = getBrowserSupabaseClient();
  if (uploadedStoragePaths.length > 0) {
    await supabase.storage.from("post_media").remove(uploadedStoragePaths);
  }
  await supabase.from("posts").delete().eq("id", postId);
}

export function CreatePostForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
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

  function resetComposer() {
    formRef.current?.reset();
    setCaption("");
    revokePreviews(previewUrlsRef.current);
    setSelectedFiles([]);
    setPreviewUrls([]);
    setPreviewKinds([]);
    setMediaAspect(DEFAULT_MEDIA_ASPECT_RATIO);
    setFormError(null);
  }

  useEffect(() => {
    return () => {
      revokePreviews(previewUrlsRef.current);
    };
  }, []);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setFormError(null);

    startTransition(async () => {
      // Never use `new FormData(form)` — a named `<input type="file">` would serialize
      // binaries into the Server Action POST and hit Vercel’s ~4.5MB function body limit (413).
      const postTypeSelect = form.querySelector<HTMLSelectElement>(
        'select[name="post_type"]',
      );
      if (!postTypeSelect) {
        setFormError("Something went wrong with the form. Refresh and try again.");
        return;
      }
      const meta = new FormData();
      meta.set("caption", caption);
      meta.set("post_type", postTypeSelect.value);
      meta.set("media_aspect_ratio", mediaAspect);

      const draft = await createPostAction(undefined, meta);
      if (!draft.ok) {
        setFormError(draft.error);
        return;
      }

      const postId = draft.postId;

      if (selectedFiles.length === 0) {
        trackProductEvent(PRODUCT_EVENTS.POST_CREATED, { post_id: postId });
        resetComposer();
        router.refresh();
        return;
      }

      if (selectedFiles.length > POST_CAROUSEL_MAX_MEDIA) {
        await cleanupDraftPost(postId, []);
        setFormError(
          `You can attach up to ${POST_CAROUSEL_MAX_MEDIA} photos or videos per post.`,
        );
        return;
      }

      const supabase = getBrowserSupabaseClient();
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr || !user) {
        await cleanupDraftPost(postId, []);
        setFormError("Sign in required.");
        return;
      }

      const uploadedPaths: string[] = [];
      const items: {
        storagePath: string;
        kind: "image" | "video";
        mimeType: string;
        sortOrder: number;
      }[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const valid = validatePostFeedFile(file);
        if (!valid.ok) {
          await cleanupDraftPost(postId, uploadedPaths);
          setFormError(valid.error);
          return;
        }
        const ext = extensionForPostFeedMime(valid.mime);
        const mediaId = crypto.randomUUID();
        const storagePath = `${user.id}/${postId}/${mediaId}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("post_media")
          .upload(storagePath, file, {
            upsert: false,
            contentType: valid.mime,
          });
        if (upErr) {
          await cleanupDraftPost(postId, uploadedPaths);
          setFormError(upErr.message);
          return;
        }
        uploadedPaths.push(storagePath);
        items.push({
          storagePath,
          kind: valid.kind,
          mimeType: valid.mime,
          sortOrder: i,
        });
      }

      const attached = await attachPostMediaAfterClientUploadAction({
        postId,
        items,
      });
      if (!attached.ok) {
        await cleanupDraftPost(postId, uploadedPaths);
        setFormError(attached.error);
        return;
      }

      trackProductEvent(PRODUCT_EVENTS.POST_CREATED, { post_id: postId });
      resetComposer();
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-md shadow-zinc-200/40 ring-1 ring-zinc-100">
      <h2 className="text-sm font-semibold text-zinc-900">Post composer</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Mix clips, flyer drops, event moments, and crate finds — add up to{" "}
        {POST_CAROUSEL_MAX_MEDIA} photos or videos in one carousel (like Instagram).
      </p>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="mt-4 space-y-5"
      >
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
            {/* No `name` on file input — binaries go to Supabase from the browser, not through Server Actions (Vercel 4.5MB limit). */}
            <input
              id="media"
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
                ? `${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"} selected · up to ${POST_CAROUSEL_MAX_MEDIA} · images ≤${POST_IMAGE_MAX_MB}MB · videos ≤${POST_VIDEO_MAX_MB}MB each (typical 2–3 min phone clips; we limit file size, not minutes). Large files upload from your device straight to storage.`
                : `Select one or more · carousel up to ${POST_CAROUSEL_MAX_MEDIA} items · images ≤${POST_IMAGE_MAX_MB}MB · videos ≤${POST_VIDEO_MAX_MB}MB (most 2–3 min clips fit). Uploads do not pass through the web server.`}
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
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-zinc-600">Media frame</legend>
          <p className="text-[11px] text-zinc-600">
            How media is cropped in the feed — portrait/square/vertical (Instagram-style) or 16:9
            for YouTube-style landscape clips (applies to each slide).
          </p>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Media frame">
            {MEDIA_ASPECT_RATIOS.map((r) => {
              const selected = mediaAspect === r;
              return (
                <label
                  key={r}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-left text-sm transition ${
                    selected
                      ? "border-amber-400 bg-amber-50/90 text-zinc-900 ring-1 ring-amber-300/60"
                      : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="media_aspect_ratio"
                    value={r}
                    checked={selected}
                    onChange={() => setMediaAspect(r)}
                    className="mt-0.5 h-4 w-4 shrink-0 border-zinc-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="leading-snug">{MEDIA_ASPECT_LABELS[r]}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
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
          <SubmitButton pending={isPending} />
        </div>
        {formError ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {formError}
          </p>
        ) : null}
      </form>
    </section>
  );
}
