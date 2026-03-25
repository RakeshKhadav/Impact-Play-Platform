export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProfileRole = "subscriber" | "admin";
export type SubscriptionPlanType = "monthly" | "yearly";
export type SubscriptionStatus = "active" | "cancelled" | "expired" | "past_due";
export type DrawStatus = "draft" | "simulated" | "published";
export type DrawLogicMode = "random" | "weighted";
export type PrizeTier = "none" | "three_match" | "four_match" | "five_match";
export type WinnerVerificationStatus = "pending" | "approved" | "rejected";
export type WinnerPaymentStatus = "pending" | "paid";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string;
          role: ProfileRole;
          charity_id: string | null;
          charity_contribution_percentage: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email: string;
          role?: ProfileRole;
          charity_id?: string | null;
          charity_contribution_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          email?: string;
          role?: ProfileRole;
          charity_id?: string | null;
          charity_contribution_percentage?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_charity_fk";
            columns: ["charity_id"];
            isOneToOne: false;
            referencedRelation: "charities";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_type: SubscriptionPlanType;
          status: SubscriptionStatus;
          stripe_subscription_id: string | null;
          stripe_customer_id: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_type: SubscriptionPlanType;
          status?: SubscriptionStatus;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plan_type?: SubscriptionPlanType;
          status?: SubscriptionStatus;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      golf_scores: {
        Row: {
          id: string;
          user_id: string;
          score: number;
          score_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          score: number;
          score_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          score?: number;
          score_date?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "golf_scores_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      charities: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          website_url: string | null;
          featured: boolean;
          tags: string[];
          total_raised: number;
          upcoming_events: Json | null;
          is_active: boolean;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          website_url?: string | null;
          featured?: boolean;
          tags?: string[];
          total_raised?: number;
          upcoming_events?: Json | null;
          is_active?: boolean;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          website_url?: string | null;
          featured?: boolean;
          tags?: string[];
          total_raised?: number;
          upcoming_events?: Json | null;
          is_active?: boolean;
          is_published?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      draws: {
        Row: {
          id: string;
          draw_month: string;
          title: string;
          status: DrawStatus;
          engine_version: number;
          logic_mode: DrawLogicMode;
          draw_numbers: number[] | null;
          entry_cutoff_at: string;
          simulated_at: string | null;
          published_at: string | null;
          gross_pool: number;
          operations_pool: number;
          charity_pool: number;
          winner_pool: number;
          five_match_pool: number;
          four_match_pool: number;
          three_match_pool: number;
          five_match_rollover_in: number;
          five_match_rollover_out: number;
          rollover_from_previous: number;
          rollover_to_next: number;
          eligible_count: number;
          active_subscriber_count_snapshot: number;
          simulated_winner_user_id: string | null;
          weighted_seed: string | null;
          notes: string | null;
          metadata: Json;
          calculation_metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          draw_month: string;
          title: string;
          status?: DrawStatus;
          engine_version?: number;
          logic_mode?: DrawLogicMode;
          draw_numbers?: number[] | null;
          entry_cutoff_at: string;
          simulated_at?: string | null;
          published_at?: string | null;
          gross_pool?: number;
          operations_pool?: number;
          charity_pool?: number;
          winner_pool?: number;
          five_match_pool?: number;
          four_match_pool?: number;
          three_match_pool?: number;
          five_match_rollover_in?: number;
          five_match_rollover_out?: number;
          rollover_from_previous?: number;
          rollover_to_next?: number;
          eligible_count?: number;
          active_subscriber_count_snapshot?: number;
          simulated_winner_user_id?: string | null;
          weighted_seed?: string | null;
          notes?: string | null;
          metadata?: Json;
          calculation_metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          draw_month?: string;
          title?: string;
          status?: DrawStatus;
          engine_version?: number;
          logic_mode?: DrawLogicMode;
          draw_numbers?: number[] | null;
          entry_cutoff_at?: string;
          simulated_at?: string | null;
          published_at?: string | null;
          gross_pool?: number;
          operations_pool?: number;
          charity_pool?: number;
          winner_pool?: number;
          five_match_pool?: number;
          four_match_pool?: number;
          three_match_pool?: number;
          five_match_rollover_in?: number;
          five_match_rollover_out?: number;
          rollover_from_previous?: number;
          rollover_to_next?: number;
          eligible_count?: number;
          active_subscriber_count_snapshot?: number;
          simulated_winner_user_id?: string | null;
          weighted_seed?: string | null;
          notes?: string | null;
          metadata?: Json;
          calculation_metadata?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "draws_simulated_winner_user_id_fkey";
            columns: ["simulated_winner_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      draw_participants: {
        Row: {
          id: string;
          draw_id: string;
          user_id: string;
          score_set: number[];
          match_count: number;
          prize_tier: PrizeTier;
          prize_amount: number;
          is_eligible: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          draw_id: string;
          user_id: string;
          score_set: number[];
          match_count?: number;
          prize_tier?: PrizeTier;
          prize_amount?: number;
          is_eligible?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          score_set?: number[];
          match_count?: number;
          prize_tier?: PrizeTier;
          prize_amount?: number;
          is_eligible?: boolean;
          metadata?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "draw_participants_draw_id_fkey";
            columns: ["draw_id"];
            isOneToOne: false;
            referencedRelation: "draws";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "draw_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      winners: {
        Row: {
          id: string;
          draw_id: string;
          participant_id: string | null;
          user_id: string;
          rank: number;
          match_count: number | null;
          prize_tier: PrizeTier;
          prize_amount: number;
          charity_id: string | null;
          engine_version: number;
          verification_status: WinnerVerificationStatus;
          verification_notes: string | null;
          verification_reviewed_by: string | null;
          verification_reviewed_at: string | null;
          proof_url: string | null;
          payment_status: WinnerPaymentStatus;
          payment_reference: string | null;
          payment_paid_at: string | null;
          payout_reference: string | null;
          payout_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          draw_id: string;
          participant_id?: string | null;
          user_id: string;
          rank?: number;
          match_count?: number | null;
          prize_tier?: PrizeTier;
          prize_amount?: number;
          charity_id?: string | null;
          engine_version?: number;
          verification_status?: WinnerVerificationStatus;
          verification_notes?: string | null;
          verification_reviewed_by?: string | null;
          verification_reviewed_at?: string | null;
          proof_url?: string | null;
          payment_status?: WinnerPaymentStatus;
          payment_reference?: string | null;
          payment_paid_at?: string | null;
          payout_reference?: string | null;
          payout_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          participant_id?: string | null;
          rank?: number;
          match_count?: number | null;
          prize_tier?: PrizeTier;
          prize_amount?: number;
          charity_id?: string | null;
          engine_version?: number;
          verification_status?: WinnerVerificationStatus;
          verification_notes?: string | null;
          verification_reviewed_by?: string | null;
          verification_reviewed_at?: string | null;
          proof_url?: string | null;
          payment_status?: WinnerPaymentStatus;
          payment_reference?: string | null;
          payment_paid_at?: string | null;
          payout_reference?: string | null;
          payout_at?: string | null;
          metadata?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "winners_draw_id_fkey";
            columns: ["draw_id"];
            isOneToOne: false;
            referencedRelation: "draws";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "winners_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "draw_participants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "winners_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "winners_charity_id_fkey";
            columns: ["charity_id"];
            isOneToOne: false;
            referencedRelation: "charities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "winners_verification_reviewed_by_fkey";
            columns: ["verification_reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: { uid: string };
        Returns: boolean;
      };
      is_valid_score_set: {
        Args: { values: number[]; expected_size: number; require_unique?: boolean };
        Returns: boolean;
      };
    };
    Enums: {
      profile_role: ProfileRole;
      subscription_plan_type: SubscriptionPlanType;
      subscription_status: SubscriptionStatus;
      draw_status: DrawStatus;
      draw_logic_mode: DrawLogicMode;
      prize_tier: PrizeTier;
      winner_verification_status: WinnerVerificationStatus;
      winner_payment_status: WinnerPaymentStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
