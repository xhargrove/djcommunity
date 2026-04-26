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
          /** `member` | `admin` | `owner` — only changeable via service_role. */
          site_role: string;
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
          site_role?: string;
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
          site_role?: string;
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
          media_aspect_ratio: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          post_type: string;
          caption: string;
          media_aspect_ratio?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          post_type?: string;
          caption?: string;
          media_aspect_ratio?: string;
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
      room_messages: {
        Row: {
          id: string;
          room_id: string;
          sender_profile_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          sender_profile_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          sender_profile_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      mashup_mixtape_posts: {
        Row: {
          id: string;
          profile_id: string;
          title: string;
          description: string | null;
          download_url: string;
          kind: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          title: string;
          description?: string | null;
          download_url: string;
          kind?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          title?: string;
          description?: string | null;
          download_url?: string;
          kind?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mashup_mixtape_posts_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          recipient_profile_id: string;
          actor_profile_id: string;
          type: string;
          post_id: string | null;
          comment_id: string | null;
          room_id: string | null;
          room_message_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_profile_id: string;
          actor_profile_id: string;
          type: string;
          post_id?: string | null;
          comment_id?: string | null;
          room_id?: string | null;
          room_message_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_profile_id?: string;
          actor_profile_id?: string;
          type?: string;
          post_id?: string | null;
          comment_id?: string | null;
          room_id?: string | null;
          room_message_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      profile_blocks: {
        Row: {
          blocker_profile_id: string;
          blocked_profile_id: string;
          created_at: string;
        };
        Insert: {
          blocker_profile_id: string;
          blocked_profile_id: string;
          created_at?: string;
        };
        Update: {
          blocker_profile_id?: string;
          blocked_profile_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      content_reports: {
        Row: {
          id: string;
          reporter_profile_id: string;
          target_kind: string;
          target_id: string;
          note: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_profile_id: string;
          target_kind: string;
          target_id: string;
          note?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_profile_id?: string;
          target_kind?: string;
          target_id?: string;
          note?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      content_report_triage: {
        Row: {
          report_id: string;
          staff_note: string | null;
          reviewed_at: string | null;
          reviewed_by_profile_id: string | null;
        };
        Insert: {
          report_id: string;
          staff_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by_profile_id?: string | null;
        };
        Update: {
          report_id?: string;
          staff_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by_profile_id?: string | null;
        };
        Relationships: [];
      };
      account_deletion_requests: {
        Row: {
          id: string;
          user_id: string | null;
          profile_id: string | null;
          profile_handle_snapshot: string;
          status: string;
          message: string | null;
          created_at: string;
          updated_at: string;
          staff_note: string | null;
          reviewed_at: string | null;
          reviewed_by_profile_id: string | null;
          execution_status: string;
          last_error_code: string | null;
          last_error_at: string | null;
          execution_attempts: number;
          executed_at: string | null;
          last_execution_stage: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          profile_id?: string | null;
          profile_handle_snapshot: string;
          status?: string;
          message?: string | null;
          created_at?: string;
          updated_at?: string;
          staff_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by_profile_id?: string | null;
          execution_status?: string;
          last_error_code?: string | null;
          last_error_at?: string | null;
          execution_attempts?: number;
          executed_at?: string | null;
          last_execution_stage?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          profile_id?: string | null;
          profile_handle_snapshot?: string;
          status?: string;
          message?: string | null;
          created_at?: string;
          updated_at?: string;
          staff_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by_profile_id?: string | null;
          execution_status?: string;
          last_error_code?: string | null;
          last_error_at?: string | null;
          execution_attempts?: number;
          executed_at?: string | null;
          last_execution_stage?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_profile_id_fkey",
            columns: ["profile_id"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "account_deletion_requests_reviewed_by_profile_id_fkey",
            columns: ["reviewed_by_profile_id"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
        ],
      };
    };
    Views: {
      v_account_deletion_open_ops: {
        Row: {
          id: string;
          user_id: string | null;
          profile_id: string | null;
          profile_handle_snapshot: string;
          status: string;
          message: string | null;
          created_at: string;
          updated_at: string;
          staff_note: string | null;
          reviewed_at: string | null;
          reviewed_by_profile_id: string | null;
          execution_status: string;
          last_error_code: string | null;
          last_error_at: string | null;
          execution_attempts: number;
          executed_at: string | null;
          last_execution_stage: string | null;
          ops_category: string;
          ops_severity: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      claim_account_deletion_execution: {
        Args: { p_request_id: string };
        Returns: Json;
      };
      discovery_trending_post_ids: {
        Args: { p_days: number; p_limit: number };
        Returns: string[];
      };
      discovery_trending_post_ids_for_city: {
        Args: { p_city_id: string; p_days: number; p_limit: number };
        Returns: string[];
      };
      discovery_rising_profile_ids: {
        Args: {
          p_scope_city_id: string | null;
          p_days: number;
          p_limit: number;
        };
        Returns: string[];
      };
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
export type RoomMessageRow = Database["public"]["Tables"]["room_messages"]["Row"];
export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type ProfileBlockRow = Database["public"]["Tables"]["profile_blocks"]["Row"];
export type ContentReportRow = Database["public"]["Tables"]["content_reports"]["Row"];
export type ContentReportTriageRow =
  Database["public"]["Tables"]["content_report_triage"]["Row"];
export type AccountDeletionRequestRow =
  Database["public"]["Tables"]["account_deletion_requests"]["Row"];
export type AccountDeletionOpenOpsRow =
  Database["public"]["Views"]["v_account_deletion_open_ops"]["Row"];
export type MashupMixtapePostRow =
  Database["public"]["Tables"]["mashup_mixtape_posts"]["Row"];
