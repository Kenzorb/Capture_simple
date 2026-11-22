export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      article_concepts: {
        Row: {
          article_id: string;
          concept_id: string;
          evidence_chunk_ids: string[];
          user_id: string;
        };
        Insert: {
          article_id: string;
          concept_id: string;
          evidence_chunk_ids?: string[];
          user_id: string;
        };
        Update: {
          article_id?: string;
          concept_id?: string;
          evidence_chunk_ids?: string[];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "article_concepts_user_id_article_id_fkey";
            columns: ["user_id", "article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "article_concepts_user_id_concept_id_fkey";
            columns: ["user_id", "concept_id"];
            isOneToOne: false;
            referencedRelation: "concepts";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      article_contents: {
        Row: {
          article_id: string;
          cleaned_text: string;
          content_hash: string | null;
          created_at: string;
          extraction_method: string | null;
          language: string | null;
          updated_at: string;
          user_id: string;
          word_count: number | null;
        };
        Insert: {
          article_id: string;
          cleaned_text: string;
          content_hash?: string | null;
          created_at?: string;
          extraction_method?: string | null;
          language?: string | null;
          updated_at?: string;
          user_id: string;
          word_count?: number | null;
        };
        Update: {
          article_id?: string;
          cleaned_text?: string;
          content_hash?: string | null;
          created_at?: string;
          extraction_method?: string | null;
          language?: string | null;
          updated_at?: string;
          user_id?: string;
          word_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "article_contents_user_id_article_id_fkey";
            columns: ["user_id", "article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      article_topics: {
        Row: {
          article_id: string;
          assignment_source: string;
          confidence: number | null;
          created_at: string;
          is_primary: boolean;
          topic_id: string;
          user_id: string;
        };
        Insert: {
          article_id: string;
          assignment_source: string;
          confidence?: number | null;
          created_at?: string;
          is_primary?: boolean;
          topic_id: string;
          user_id: string;
        };
        Update: {
          article_id?: string;
          assignment_source?: string;
          confidence?: number | null;
          created_at?: string;
          is_primary?: boolean;
          topic_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "article_topics_user_id_article_id_fkey";
            columns: ["user_id", "article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "article_topics_user_id_topic_id_fkey";
            columns: ["user_id", "topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      articles: {
        Row: {
          archived_at: string | null;
          author: string | null;
          canonical_url: string;
          canonical_url_hash: string | null;
          captured_at: string;
          domain: string;
          id: string;
          published_at: string | null;
          status: Database["public"]["Enums"]["article_status"];
          title: string;
          updated_at: string;
          url: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          author?: string | null;
          canonical_url: string;
          canonical_url_hash?: string | null;
          captured_at?: string;
          domain: string;
          id?: string;
          published_at?: string | null;
          status?: Database["public"]["Enums"]["article_status"];
          title: string;
          updated_at?: string;
          url: string;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          author?: string | null;
          canonical_url?: string;
          canonical_url_hash?: string | null;
          captured_at?: string;
          domain?: string;
          id?: string;
          published_at?: string | null;
          status?: Database["public"]["Enums"]["article_status"];
          title?: string;
          updated_at?: string;
          url?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "articles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      billing_events: {
        Row: {
          event_type: string;
          processed_at: string;
          stripe_event_id: string;
        };
        Insert: {
          event_type: string;
          processed_at?: string;
          stripe_event_id: string;
        };
        Update: {
          event_type?: string;
          processed_at?: string;
          stripe_event_id?: string;
        };
        Relationships: [];
      };
      concepts: {
        Row: {
          created_at: string;
          definition: string | null;
          id: string;
          name: string;
          normalized_name: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          definition?: string | null;
          id?: string;
          name: string;
          normalized_name?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          definition?: string | null;
          id?: string;
          name?: string;
          normalized_name?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "concepts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_outbox: {
        Row: {
          attempts: number;
          created_at: string;
          dispatched_at: string | null;
          id: string;
          job_id: string;
          next_attempt_at: string;
          status: Database["public"]["Enums"]["dispatch_status"];
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          dispatched_at?: string | null;
          id?: string;
          job_id: string;
          next_attempt_at?: string;
          status?: Database["public"]["Enums"]["dispatch_status"];
        };
        Update: {
          attempts?: number;
          created_at?: string;
          dispatched_at?: string | null;
          id?: string;
          job_id?: string;
          next_attempt_at?: string;
          status?: Database["public"]["Enums"]["dispatch_status"];
        };
        Relationships: [
          {
            foreignKeyName: "job_outbox_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: true;
            referencedRelation: "processing_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      personal_notes: {
        Row: {
          article_id: string;
          body: string;
          created_at: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          article_id: string;
          body: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          article_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "personal_notes_user_id_article_id_fkey";
            columns: ["user_id", "article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      processing_jobs: {
        Row: {
          article_id: string;
          attempts: number;
          created_at: string;
          error_code: string | null;
          finished_at: string | null;
          id: string;
          idempotency_key: string;
          status: Database["public"]["Enums"]["processing_job_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          article_id: string;
          attempts?: number;
          created_at?: string;
          error_code?: string | null;
          finished_at?: string | null;
          id?: string;
          idempotency_key: string;
          status?: Database["public"]["Enums"]["processing_job_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          article_id?: string;
          attempts?: number;
          created_at?: string;
          error_code?: string | null;
          finished_at?: string | null;
          id?: string;
          idempotency_key?: string;
          status?: Database["public"]["Enums"]["processing_job_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processing_jobs_user_id_article_id_fkey";
            columns: ["user_id", "article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean;
          created_at: string;
          period_end: string | null;
          plan: Database["public"]["Enums"]["capture_plan"];
          status: string | null;
          stripe_customer_id: string | null;
          stripe_price_id: string | null;
          stripe_subscription_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          period_end?: string | null;
          plan?: Database["public"]["Enums"]["capture_plan"];
          status?: string | null;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          period_end?: string | null;
          plan?: Database["public"]["Enums"]["capture_plan"];
          status?: string | null;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      topic_tree_versions: {
        Row: {
          revision: number;
          user_id: string;
        };
        Insert: {
          revision?: number;
          user_id: string;
        };
        Update: {
          revision?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "topic_tree_versions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      topics: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          normalized_name: string | null;
          parent_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          normalized_name?: string | null;
          parent_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          normalized_name?: string | null;
          parent_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "topics_parent_fk";
            columns: ["user_id", "parent_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "topics_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      usage_events: {
        Row: {
          created_at: string;
          id: string;
          job_id: string;
          state: Database["public"]["Enums"]["usage_reservation_state"];
          units: number;
          updated_at: string;
          usage_period_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          job_id: string;
          state?: Database["public"]["Enums"]["usage_reservation_state"];
          units?: number;
          updated_at?: string;
          usage_period_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          job_id?: string;
          state?: Database["public"]["Enums"]["usage_reservation_state"];
          units?: number;
          updated_at?: string;
          usage_period_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usage_events_user_id_job_id_fkey";
            columns: ["user_id", "job_id"];
            isOneToOne: false;
            referencedRelation: "processing_jobs";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "usage_events_user_id_usage_period_id_fkey";
            columns: ["user_id", "usage_period_id"];
            isOneToOne: false;
            referencedRelation: "usage_periods";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      usage_periods: {
        Row: {
          article_limit: number;
          id: string;
          period_end: string;
          period_start: string;
          reserved: number;
          used: number;
          user_id: string;
        };
        Insert: {
          article_limit: number;
          id?: string;
          period_end: string;
          period_start: string;
          reserved?: number;
          used?: number;
          user_id: string;
        };
        Update: {
          article_limit?: number;
          id?: string;
          period_end?: string;
          period_start?: string;
          reserved?: number;
          used?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usage_periods_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      article_status:
        | "saved"
        | "queued"
        | "processing"
        | "ready"
        | "failed"
        | "quota_limited"
        | "unsupported";
      capture_plan: "free" | "pro";
      dispatch_status: "pending" | "dispatched" | "dead";
      processing_job_status:
        "queued" | "processing" | "succeeded" | "failed" | "canceled";
      usage_reservation_state: "reserved" | "consumed" | "released";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      article_status: [
        "saved",
        "queued",
        "processing",
        "ready",
        "failed",
        "quota_limited",
        "unsupported",
      ],
      capture_plan: ["free", "pro"],
      dispatch_status: ["pending", "dispatched", "dead"],
      processing_job_status: [
        "queued",
        "processing",
        "succeeded",
        "failed",
        "canceled",
      ],
      usage_reservation_state: ["reserved", "consumed", "released"],
    },
  },
} as const;
