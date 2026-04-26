"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  MEDIA_ASPECT_RATIOS,
  MEDIA_ASPECT_SHORT_LABELS,
  mediaAspectFrameClass,
  type MediaAspectRatio,
} from "@/lib/posts/media-aspect";

type MediaItem = {
  id: string;
  kind: "image" | "video";
  publicUrl: string;
};

type ViewMode = "author" | MediaAspectRatio | "fit";

function normalizeAuthorRatio(raw: string | null | undefined): MediaAspectRatio {
  if (raw === "1_1" || raw === "9_16" || raw === "4_5" || raw === "16_9") {
    return raw;
  }
  return "4_5";
}

function MediaSlide({
  m,
  effectiveRatio,
  priorityFirstImage,
  slideIndex,
}: {
  m: MediaItem;
  effectiveRatio: MediaAspectRatio | "fit";
  priorityFirstImage: boolean;
  slideIndex: number;
}) {
  if (m.kind === "image") {
    if (effectiveRatio === "fit") {
      return (
        <div className="relative w-full bg-zinc-100">
          <Image
            src={m.publicUrl}
            alt=""
            width={1600}
            height={2000}
            className="mx-auto h-auto max-h-[min(85vh,780px)] w-full object-contain"
            sizes="(max-width: 768px) 100vw, 36rem"
            priority={priorityFirstImage && slideIndex === 0}
          />
        </div>
      );
    }
    return (
      <div
        className={`relative w-full overflow-hidden bg-zinc-100 ${mediaAspectFrameClass(effectiveRatio)}`}
      >
        <Image
          src={m.publicUrl}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 36rem"
          priority={priorityFirstImage && slideIndex === 0}
        />
      </div>
    );
  }

  if (effectiveRatio === "fit") {
    return (
      <div className="flex w-full justify-center bg-zinc-900">
        <video
          src={m.publicUrl}
          controls
          playsInline
          className="max-h-[min(85vh,780px)] w-full max-w-full object-contain"
          preload="metadata"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden bg-zinc-900 ${mediaAspectFrameClass(effectiveRatio)}`}
    >
      <video
        src={m.publicUrl}
        controls
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        preload="metadata"
      />
    </div>
  );
}

function MediaCarousel({
  media,
  effectiveRatio,
  priorityFirstImage,
}: {
  media: MediaItem[];
  effectiveRatio: MediaAspectRatio | "fit";
  priorityFirstImage: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const updateIndexFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }
    const w = el.clientWidth;
    if (w <= 0) {
      return;
    }
    const i = Math.round(el.scrollLeft / w);
    setIndex(Math.min(media.length - 1, Math.max(0, i)));
  }, [media.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }
    updateIndexFromScroll();
  }, [media.length, updateIndexFromScroll]);

  const goTo = useCallback(
    (i: number) => {
      const el = scrollerRef.current;
      if (!el) {
        return;
      }
      const w = el.clientWidth;
      el.scrollTo({ left: i * w, behavior: "smooth" });
    },
    [],
  );

  const prev = useCallback(() => {
    goTo(Math.max(0, index - 1));
  }, [goTo, index]);

  const next = useCallback(() => {
    goTo(Math.min(media.length - 1, index + 1));
  }, [goTo, index, media.length]);

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={updateIndexFromScroll}
        className="flex touch-pan-x snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carousel"
        aria-label="Post media"
      >
        {media.map((m, i) => (
          <div
            key={m.id}
            className="w-full shrink-0 snap-center snap-always"
            aria-hidden={i !== index}
          >
            <MediaSlide
              m={m}
              effectiveRatio={effectiveRatio}
              priorityFirstImage={priorityFirstImage}
              slideIndex={i}
            />
          </div>
        ))}
      </div>

      {media.length > 1 ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
            <span className="rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm">
              {index + 1} / {media.length}
            </span>
          </div>
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            className="absolute left-1 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-30 sm:flex"
            aria-label="Previous slide"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" aria-hidden>
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 18l-6-6 6-6"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={next}
            disabled={index >= media.length - 1}
            className="absolute right-1 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-30 sm:flex"
            aria-label="Next slide"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" aria-hidden>
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 18l6-6-6-6"
              />
            </svg>
          </button>
          <div
            className="pointer-events-auto absolute bottom-2 left-0 right-0 flex justify-center gap-1.5"
            role="tablist"
            aria-label="Slide indicators"
          >
            {media.map((m, i) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function PostCardMedia({
  media,
  authorMediaAspectRatio,
  priorityFirstImage,
}: {
  media: MediaItem[];
  authorMediaAspectRatio: string;
  priorityFirstImage: boolean;
}) {
  const authorRatio = normalizeAuthorRatio(authorMediaAspectRatio);
  const [viewMode, setViewMode] = useState<ViewMode>("author");

  const effectiveRatio = useMemo((): MediaAspectRatio | "fit" => {
    if (viewMode === "author") {
      return authorRatio;
    }
    if (viewMode === "fit") {
      return "fit";
    }
    return viewMode;
  }, [authorRatio, viewMode]);

  if (media.length === 0) {
    return null;
  }

  return (
    <div className="border-y border-zinc-100 bg-zinc-50">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100/80 bg-white/80 px-3 py-2 backdrop-blur-sm">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          View
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode("author")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              viewMode === "author"
                ? "bg-amber-100 text-amber-950 ring-1 ring-amber-300/80"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            As posted
          </button>
          {MEDIA_ASPECT_RATIOS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setViewMode(r)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                viewMode === r
                  ? "bg-amber-100 text-amber-950 ring-1 ring-amber-300/80"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {MEDIA_ASPECT_SHORT_LABELS[r]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setViewMode("fit")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              viewMode === "fit"
                ? "bg-amber-100 text-amber-950 ring-1 ring-amber-300/80"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Full
          </button>
        </div>
        <span
          className="hidden text-[10px] text-zinc-400 sm:inline"
          title="Your choice applies on this device only"
        >
          Optional
        </span>
      </div>

      {media.length === 1 ? (
        <MediaSlide
          m={media[0]}
          effectiveRatio={effectiveRatio}
          priorityFirstImage={priorityFirstImage}
          slideIndex={0}
        />
      ) : (
        <MediaCarousel
          media={media}
          effectiveRatio={effectiveRatio}
          priorityFirstImage={priorityFirstImage}
        />
      )}
    </div>
  );
}
