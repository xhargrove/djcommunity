/**
 * Supabase `Database` type — regenerate: `npx supabase gen types typescript --linked`
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      cities: {
        Row: {
          id: string;
          slug: string;
          name: string;
          region: string | null;
          country_code: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          region?: string | null;
          country_code?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          region?: string | null;
          country_code?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      genres: {
        Row: {
          id: string;
          slug: string;
          label: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          label: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          label?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      dj_types: {
        Row: {
          id: string;
          slug: string;
          label: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          label: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          label?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      profile_genres: {
        Row: {
          profile_id: string;
          genre_id: string;
        };
        Insert: {
          profile_id: string;
          genre_id: string;
        };
        Update: {
          profile_id?: string;
          genre_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          handle: string;
          display_name: string;
          bio: string | null;
          city_id: string;
          dj_type_id: string;
          gear_setup: string | null;
          links: Json;
          featured_mix_link: string | null;
          booking_contact: string | null;
          avatar_url: string | null;
          banner_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          handle: string;
          display_name: string;
          bio?: string | null;
          city_id: string;
          dj_type_id: string;
          gear_setup?: string | null;
          links?: Json;
          featured_mix_link?: string | null;
          booking_contact?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          handle?: string;
          display_name?: string;
          bio?: string | null;
          city_id?: string;
          dj_type_id?: string;
          gear_setup?: string | null;
          links?: Json;
          featured_mix_link?: string | null;
          booking_contact?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          profile_id: string;
          post_type: string;
          caption: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          post_type: string;
          caption: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          post_type?: string;
          caption?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      post_media: {
        Row: {
          id: string;
          post_id: string;
          storage_path: string;
          kind: string;
          mime_type: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          storage_path: string;
          kind: string;
          mime_type: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          storage_path?: string;
          kind?: string;
          mime_type?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      post_likes: {
        Row: {
          post_id: string;
          profile_id: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          profile_id: string;
          created_at?: string;
        };
        Update: {
          post_id?: string;
          profile_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      post_saves: {
        Row: {
          post_id: string;
          profile_id: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          profile_id: string;
          created_at?: string;
        };
        Update: {
          post_id?: string;
          profile_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      post_comments: {
        Row: {
          id: string;
          post_id: string;
          author_profile_id: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_profile_id: string;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          author_profile_id?: string;
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          visibility: string;
          room_type: string;
          city_id: string | null;
          created_by_profile_id: string;
          member_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          visibility?: string;
          room_type?: string;
          city_id?: string | null;
          created_by_profile_id: string;
          member_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          visibility?: string;
          room_type?: string;
          city_id?: string | null;
          created_by_profile_id?: string;
          member_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      room_memberships: {
        Row: {
          room_id: string;
          profile_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          room_id: string;
          profile_id: string;
          role?: string;
          joined_at?: string;
        };
        Update: {
          room_id?: string;
          profile_id?: string;
          role?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type CityRow = Database["public"]["Tables"]["cities"]["Row"];
export type GenreRow = Database["public"]["Tables"]["genres"]["Row"];
export type DjTypeRow = Database["public"]["Tables"]["dj_types"]["Row"];
export type PostRow = Database["public"]["Tables"]["posts"]["Row"];
export type PostMediaRow = Database["public"]["Tables"]["post_media"]["Row"];
export type PostCommentRow = Database["public"]["Tables"]["post_comments"]["Row"];
export type FollowRow = Database["public"]["Tables"]["follows"]["Row"];
export type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
export type RoomMembershipRow =
  Database["public"]["Tables"]["room_memberships"]["Row"];
