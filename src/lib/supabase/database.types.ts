// ============================================================
// TeamPulse — Supabase Database Types
// src/lib/supabase/database.types.ts
//
// Hand-authored to mirror supabase/migrations/001_initial_schema.sql
// and supabase/policies/002_rls_policies.sql.
//
// Once you have a live Supabase project, regenerate this file with:
//   supabase gen types typescript --linked > src/lib/supabase/database.types.ts
// (or via the Supabase MCP `generate_typescript_types` tool)
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type NoteType = 'general' | 'strength' | 'growth'
type NoteTag = 'Communication' | 'Technical' | 'Collaboration' | 'Leadership' | 'Delivery'
type UserRole = 'admin' | 'member'
type TeamRole = 'lead' | 'member'
type CycleStatus = 'active' | 'closed' | 'archived'
type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'removed'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_id: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          owner_id?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          profile_id: string
          role: UserRole
          invited_by: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          profile_id: string
          role?: UserRole
          invited_by?: string | null
          joined_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          profile_id?: string
          role?: UserRole
          invited_by?: string | null
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_members_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      teams: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          description?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          profile_id: string
          role: TeamRole
          added_by: string | null
          added_at: string
        }
        Insert: {
          id?: string
          team_id: string
          profile_id: string
          role?: TeamRole
          added_by?: string | null
          added_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          profile_id?: string
          role?: TeamRole
          added_by?: string | null
          added_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_members_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'team_members_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'team_members_added_by_fkey'
            columns: ['added_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      feedback_cycles: {
        Row: {
          id: string
          team_id: string
          name: string
          status: CycleStatus
          starts_at: string
          ends_at: string | null
          closed_at: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          status?: CycleStatus
          starts_at?: string
          ends_at?: string | null
          closed_at?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          status?: CycleStatus
          starts_at?: string
          ends_at?: string | null
          closed_at?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'feedback_cycles_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'feedback_cycles_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      notes: {
        Row: {
          id: string
          team_id: string
          cycle_id: string | null
          recipient_id: string
          author_id: string
          note_type: NoteType
          content: string
          tags: NoteTag[]
          position: number
          done: boolean
          done_at: string | null
          priority: boolean
          created_at: string
          created_at_display: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          cycle_id?: string | null
          recipient_id: string
          author_id: string
          note_type?: NoteType
          content: string
          tags?: NoteTag[]
          position?: number
          done?: boolean
          done_at?: string | null
          priority?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          cycle_id?: string | null
          recipient_id?: string
          author_id?: string
          note_type?: NoteType
          content?: string
          tags?: NoteTag[]
          position?: number
          done?: boolean
          done_at?: string | null
          priority?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      note_reactions: {
        Row: {
          id: string
          note_id: string
          reactor_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          note_id: string
          reactor_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          note_id?: string
          reactor_id?: string
          emoji?: string
          created_at?: string
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          id: string
          note_id: string
          reporter_id: string | null
          reason: string
          status: ReportStatus
          source: string
          reviewed_by: string | null
          reviewed_at: string | null
          admin_note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          note_id: string
          reporter_id?: string | null
          reason: string
          status?: ReportStatus
          source?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          admin_note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          note_id?: string
          reporter_id?: string | null
          reason?: string
          status?: ReportStatus
          source?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          admin_note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'content_reports_note_id_fkey'
            columns: ['note_id']
            isOneToOne: false
            referencedRelation: 'notes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'content_reports_note_id_fkey'
            columns: ['note_id']
            isOneToOne: false
            referencedRelation: 'notes_admin'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'content_reports_reporter_id_fkey'
            columns: ['reporter_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'content_reports_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      note_evidence: {
        Row: {
          id: string
          note_id: string
          author_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          note_id: string
          author_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          note_id?: string
          author_id?: string
          content?: string
          created_at?: string
        }
        Relationships: []
      }
      cycle_summaries: {
        Row: {
          id: string
          cycle_id: string
          profile_id: string
          summary_text: string
          model_used: string
          generated_at: string
        }
        Insert: {
          id?: string
          cycle_id: string
          profile_id: string
          summary_text: string
          model_used?: string
          generated_at?: string
        }
        Update: {
          id?: string
          cycle_id?: string
          profile_id?: string
          summary_text?: string
          model_used?: string
          generated_at?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          id: string
          workspace_id: string
          team_id: string | null
          email: string
          role: UserRole
          token: string
          invited_by: string
          accepted_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          team_id?: string | null
          email: string
          role?: UserRole
          token?: string
          invited_by: string
          accepted_at?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          team_id?: string | null
          email?: string
          role?: UserRole
          token?: string
          invited_by?: string
          accepted_at?: string | null
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          workspace_id: string | null
          actor_id: string | null
          action: string
          target_table: string | null
          target_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          actor_id?: string | null
          action: string
          target_table?: string | null
          target_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string | null
          actor_id?: string | null
          action?: string
          target_table?: string | null
          target_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      notes_safe: {
        Row: {
          id: string
          team_id: string
          cycle_id: string | null
          recipient_id: string
          note_type: NoteType
          content: string
          tags: NoteTag[]
          position: number
          done: boolean
          done_at: string | null
          created_at: string
          updated_at: string
          is_mine: boolean
          can_mark_done: boolean
          can_edit: boolean
          priority: boolean
        }
        Relationships: []
      }
      notes_admin: {
        Row: {
          id: string
          team_id: string
          cycle_id: string | null
          recipient_id: string
          author_id: string
          note_type: NoteType
          content: string
          tags: NoteTag[]
          position: number
          done: boolean
          done_at: string | null
          priority: boolean
          created_at: string
          created_at_display: string
          updated_at: string
          author_name: string
          author_email: string
          recipient_name: string
        }
        Relationships: []
      }
      note_reaction_counts: {
        Row: {
          note_id: string
          emoji: string
          count: number
          reacted_by_me: boolean
        }
        Relationships: []
      }
    }
    Functions: {
      is_workspace_admin: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { p_team_id: string }
        Returns: boolean
      }
      team_workspace_id: {
        Args: { p_team_id: string }
        Returns: string
      }
    }
    Enums: {
      note_type: NoteType
      note_tag: NoteTag
      user_role: UserRole
      team_role: TeamRole
      cycle_status: CycleStatus
      report_status: ReportStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
