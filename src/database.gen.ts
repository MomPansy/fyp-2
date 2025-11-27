export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      assessment_problems: {
        Row: {
          archived_at: string | null
          assessment_id: string
          created_at: string
          id: string
          problem_id: string
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          assessment_id: string
          created_at?: string
          id?: string
          problem_id: string
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          assessment_id?: string
          created_at?: string
          id?: string
          problem_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_problems_assessment_id_assessments_id_fk"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_problems_problem_id_user_problems_id_fk"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "user_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_student_invitations: {
        Row: {
          active: boolean
          archived_at: string | null
          assessment_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          invitation_token: string | null
          matriculation_number: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          archived_at?: string | null
          assessment_id: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          invitation_token?: string | null
          matriculation_number: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          archived_at?: string | null
          assessment_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          invitation_token?: string | null
          matriculation_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_student_invitations_assessment_id_assessments_id_fk"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          archived_at: string | null
          created_at: string
          date_time_scheduled: string | null
          duration: number
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          date_time_scheduled?: string | null
          duration: number
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          date_time_scheduled?: string | null
          duration?: number
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_tables: {
        Row: {
          column_types: Json | null
          created_at: string
          data_path: string
          description: string | null
          id: string
          number_of_rows: number | null
          problem_id: string
          relations: Json | null
          table_name: string
          updated_at: string | null
        }
        Insert: {
          column_types?: Json | null
          created_at?: string
          data_path: string
          description?: string | null
          id?: string
          number_of_rows?: number | null
          problem_id: string
          relations?: Json | null
          table_name: string
          updated_at?: string | null
        }
        Update: {
          column_types?: Json | null
          created_at?: string
          data_path?: string
          description?: string | null
          id?: string
          number_of_rows?: number | null
          problem_id?: string
          relations?: Json | null
          table_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "problem_tables_problem_id_fk"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      problems: {
        Row: {
          answer: string | null
          archived_at: string | null
          created_at: string
          description: string
          dialect: Database["public"]["Enums"]["dialects"]
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          answer?: string | null
          archived_at?: string | null
          created_at?: string
          description: string
          dialect?: Database["public"]["Enums"]["dialects"]
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          answer?: string | null
          archived_at?: string | null
          created_at?: string
          description?: string
          dialect?: Database["public"]["Enums"]["dialects"]
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_assessments: {
        Row: {
          archived_at: string | null
          assessment_id: string
          created_at: string
          id: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          assessment_id: string
          created_at?: string
          id?: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          assessment_id?: string
          created_at?: string
          id?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_assessments_assessment_id_assessments_id_fk"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assessments_student_id_users_id_fk"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_details: {
        Row: {
          archived_at: string | null
          assignment_problem_id: string
          candidate_answer: string
          created_at: string
          dialect: Database["public"]["Enums"]["dialects"]
          grade: string
          id: string
          submission_id: string
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          assignment_problem_id: string
          candidate_answer: string
          created_at?: string
          dialect?: Database["public"]["Enums"]["dialects"]
          grade?: string
          id?: string
          submission_id: string
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          assignment_problem_id?: string
          candidate_answer?: string
          created_at?: string
          dialect?: Database["public"]["Enums"]["dialects"]
          grade?: string
          id?: string
          submission_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_details_assignment_problem_id_assessment_problems_id"
            columns: ["assignment_problem_id"]
            isOneToOne: false
            referencedRelation: "assessment_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_details_submission_id_submissions_id_fk"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          student_assessment_id: string
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          student_assessment_id: string
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          student_assessment_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_student_assessment_id_student_assessments_id_fk"
            columns: ["student_assessment_id"]
            isOneToOne: false
            referencedRelation: "student_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_problem_tables: {
        Row: {
          column_types: Json | null
          created_at: string
          data_path: string
          description: string | null
          id: string
          number_of_rows: number | null
          relations: Json | null
          table_name: string
          updated_at: string | null
          user_problem_id: string
        }
        Insert: {
          column_types?: Json | null
          created_at?: string
          data_path: string
          description?: string | null
          id?: string
          number_of_rows?: number | null
          relations?: Json | null
          table_name: string
          updated_at?: string | null
          user_problem_id: string
        }
        Update: {
          column_types?: Json | null
          created_at?: string
          data_path?: string
          description?: string | null
          id?: string
          number_of_rows?: number | null
          relations?: Json | null
          table_name?: string
          updated_at?: string | null
          user_problem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "problem_user_tables_user_problem_id_fk"
            columns: ["user_problem_id"]
            isOneToOne: false
            referencedRelation: "user_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      user_problems: {
        Row: {
          answer: string | null
          archived_at: string | null
          created_at: string
          description: string
          dialect: Database["public"]["Enums"]["dialects"]
          id: string
          name: string
          problem_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          answer?: string | null
          archived_at?: string | null
          created_at?: string
          description: string
          dialect?: Database["public"]["Enums"]["dialects"]
          id?: string
          name: string
          problem_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          answer?: string | null
          archived_at?: string | null
          created_at?: string
          description?: string
          dialect?: Database["public"]["Enums"]["dialects"]
          id?: string
          name?: string
          problem_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_problems_problem_id_fk"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_problems_user_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          role_id: string
          updated_at: string | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          role_id: string
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          role_id?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_created_by_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fk"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_updated_by_fk"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          archived_at: string | null
          auth_user_id: string
          created_at: string
          email: string
          full_name: string | null
          id: string
          matriculation_number: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          auth_user_id: string
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          matriculation_number?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          auth_user_id?: string
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          matriculation_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      custom_access_token_hook: {
        Args: { event: Json }
        Returns: Json
      }
    }
    Enums: {
      dialects: "mysql" | "postgres" | "sqlite" | "sqlserver" | "oracle"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      dialects: ["mysql", "postgres", "sqlite", "sqlserver", "oracle"],
    },
  },
} as const

