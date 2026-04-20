import { describe, expect, it } from "vitest";

import {
  isCreatablePostType,
  isEditablePostType,
  labelForPostType,
  POST_TYPES,
  POST_TYPES_CREATABLE,
  POST_TYPES_EDITABLE,
} from "@/lib/posts/constants";
import {
  createPostSchema,
  updatePostSchema,
} from "@/lib/posts/schema";

describe("post type capability contract", () => {
  it("keeps editable set aligned with all persisted types", () => {
    expect(POST_TYPES_EDITABLE).toBe(POST_TYPES);
    expect(POST_TYPES_EDITABLE.length).toBe(POST_TYPES.length);
  });

  it("excludes legacy types from creatable only", () => {
    expect(POST_TYPES_CREATABLE).not.toContain("mix_drop");
    expect(POST_TYPES_CREATABLE).not.toContain("transition_clip");
    expect(POST_TYPES).toContain("mix_drop");
    expect(POST_TYPES).toContain("transition_clip");
  });

  it("isCreatablePostType / isEditablePostType", () => {
    expect(isCreatablePostType("standard")).toBe(true);
    expect(isCreatablePostType("mix_drop")).toBe(false);
    expect(isCreatablePostType("transition_clip")).toBe(false);
    expect(isEditablePostType("mix_drop")).toBe(true);
    expect(isEditablePostType("transition_clip")).toBe(true);
    expect(isEditablePostType("bogus")).toBe(false);
  });

  it("labelForPostType resolves every persisted type", () => {
    for (const t of POST_TYPES) {
      expect(labelForPostType(t).length).toBeGreaterThan(0);
    }
    expect(labelForPostType("unknown_future")).toBe("unknown_future");
  });
});

describe("createPostSchema", () => {
  it("accepts creatable post types", () => {
    const r = createPostSchema.safeParse({
      caption: "x",
      post_type: "standard",
      media_aspect_ratio: "4_5",
    });
    expect(r.success).toBe(true);
  });

  it("rejects mix_drop on create", () => {
    const r = createPostSchema.safeParse({
      caption: "x",
      post_type: "mix_drop",
      media_aspect_ratio: "4_5",
    });
    expect(r.success).toBe(false);
  });

  it("rejects transition_clip on create", () => {
    const r = createPostSchema.safeParse({
      caption: "x",
      post_type: "transition_clip",
      media_aspect_ratio: "4_5",
    });
    expect(r.success).toBe(false);
  });
});

describe("updatePostSchema", () => {
  it("allows legacy types on edit (intentional)", () => {
    for (const post_type of ["mix_drop", "transition_clip"] as const) {
      const r = updatePostSchema.safeParse({
        post_id: "00000000-0000-4000-8000-000000000001",
        caption: "x",
        post_type,
      });
      expect(r.success).toBe(true);
    }
  });

  it("rejects unknown post_type on edit", () => {
    const r = updatePostSchema.safeParse({
      post_id: "00000000-0000-4000-8000-000000000001",
      caption: "x",
      post_type: "not_a_real_type",
    });
    expect(r.success).toBe(false);
  });
});
