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
      chats: {
        Row: {
          archived_at: string | null;
          contact_id: string | null;
          created_at: string;
          envoy_id: string;
          id: string;
          lockable: boolean;
          locked: boolean;
          title: string | null;
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          archived_at?: string | null;
          contact_id?: string | null;
          created_at?: string;
          envoy_id: string;
          id?: string;
          lockable?: boolean;
          locked?: boolean;
          title?: string | null;
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          contact_id?: string | null;
          created_at?: string;
          envoy_id?: string;
          id?: string;
          lockable?: boolean;
          locked?: boolean;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chats_envoy_id_fk';
            columns: ['envoy_id'];
            referencedRelation: 'envoys';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chats_user_id_fk';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chats_workspace_id_fk';
            columns: ['workspace_id'];
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      contacts: {
        Row: {
          archived_at: string | null;
          chat_id: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          phone: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          archived_at?: string | null;
          chat_id?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          phone?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          chat_id?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          phone?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contacts_chat_id_fk';
            columns: ['chat_id'];
            referencedRelation: 'chats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contacts_workspace_id_fk';
            columns: ['workspace_id'];
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      document_embeddings: {
        Row: {
          archived_at: string | null;
          created_at: string;
          embedding_id: string;
          storage_object_id: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          embedding_id: string;
          storage_object_id: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          embedding_id?: string;
          storage_object_id?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'document_embeddings_embedding_id_fk';
            columns: ['embedding_id'];
            referencedRelation: 'embeddings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'document_embeddings_storage_object_id_fk';
            columns: ['storage_object_id'];
            referencedRelation: 'objects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'document_embeddings_workspace_id_fk';
            columns: ['workspace_id'];
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      embeddings: {
        Row: {
          archived_at: string | null;
          content: string;
          created_at: string;
          id: string;
          openai_1536: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          archived_at?: string | null;
          content: string;
          created_at?: string;
          id: string;
          openai_1536?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          openai_1536?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      envoy_labels: {
        Row: {
          created_at: string;
          envoy_id: string;
          label_id: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          envoy_id: string;
          label_id: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          envoy_id?: string;
          label_id?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'envoy_labels_envoy_id_fk';
            columns: ['envoy_id'];
            referencedRelation: 'envoys';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'envoy_labels_label_id_fk';
            columns: ['label_id'];
            referencedRelation: 'labels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'envoy_labels_workspace_id_fk';
            columns: ['workspace_id'];
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      envoy_statistics: {
        Row: {
          date: string;
          envoy_id: string;
          num_of_chats: number;
          num_of_leads: number;
          num_of_user_messages: number;
          workspace_id: string;
        };
        Insert: {
          date?: string;
          envoy_id: string;
          num_of_chats?: number;
          num_of_leads?: number;
          num_of_user_messages?: number;
          workspace_id: string;
        };
        Update: {
          date?: string;
          envoy_id?: string;
          num_of_chats?: number;
          num_of_leads?: number;
          num_of_user_messages?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'envoy_statistics_envoy_id_fk';
            columns: ['envoy_id'];
            referencedRelation: 'envoys';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'envoy_statistics_workspace_id_fk';
            columns: ['workspace_id'];
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      envoys: {
        Row: {
          archived_at: string | null;
          collect_contact_tool_emails: string[] | null;
          collect_contact_tool_labels: Json[] | null;
          collect_contact_tool_mode: Database['public']['Enums']['collect_contact_tool_mode'];
          collect_contact_tool_whatsapp: string | null;
          created_at: string;
          description: string | null;
          enable_chat_forwarding: boolean;
          enable_self_learning: boolean;
          greeting: string | null;
          id: string;
          leading_prompt: string;
          lock_chats_after_seconds: number;
          model: Database['public']['Enums']['envoy_openai_model'];
          name: string;
          starters: string[] | null;
          temperature: number;
          trailing_prompt: string | null;
          updated_at: string;
          widget_placeholder_text: string | null;
          widget_status: boolean;
          workspace_id: string;
        };
        Insert: {
          archived_at?: string | null;
          collect_contact_tool_emails?: string[] | null;
          collect_contact_tool_labels?: Json[] | null;
          collect_contact_tool_mode?: Database['public']['Enums']['collect_contact_tool_mode'];
          collect_contact_tool_whatsapp?: string | null;
          created_at?: string;
          description?: string | null;
          enable_chat_forwarding?: boolean;
          enable_self_learning?: boolean;
          greeting?: string | null;
          id?: string;
          leading_prompt: string;
          lock_chats_after_seconds?: number;
          model?: Database['public']['Enums']['envoy_openai_model'];
          name: string;
          starters?: string[] | null;
          temperature?: number;
          trailing_prompt?: string | null;
          updated_at?: string;
          widget_placeholder_text?: string | null;
          widget_status?: boolean;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          collect_contact_tool_emails?: string[] | null;
          collect_contact_tool_labels?: Json[] | null;
          collect_contact_tool_mode?: Database['public']['Enums']['collect_contact_tool_mode'];
          collect_contact_tool_whatsapp?: string | null;
          created_at?: string;
          description?: string | null;
          enable_chat_forwarding?: boolean;
          enable_self_learning?: boolean;
          greeting?: string | null;
          id?: string;
          leading_prompt?: string;
          lock_chats_after_seconds?: number;
          model?: Database['public']['Enums']['envoy_openai_model'];
          name?: string;
          starters?: string[] | null;
          temperature?: number;
          trailing_prompt?: string | null;
          updated_at?: string;
          widget_placeholder_text?: string | null;
          widget_status?: boolean;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'envoys_workspace_id_fk';
            columns: ['workspace_id'];
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      labels: {
        Row: {
          archived_at: string | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'labels_workspace_id_fk';
            columns: ['workspace_id'];
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      message_feedbacks: {
        Row: {
          archived_at: string | null;
          content: string;
          created_at: string;
          id: string;
          message_id: string;
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          archived_at?: string | null;
          content: string;
          created_at?: string;
          id?: string;
          message_id: string;
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          message_id?: string;
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'message_feedback_message_id_fk';
            columns: ['message_id'];
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_feedback_user_id_fk';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_workspace_id_fk';
            columns: ['workspace_id'];
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          annotations: Json[] | null;
          archived_at: string | null;
          chat_id: string;
          content: string;
          created_at: string;
          id: string;
          position: number;
          reaction: string | null;
          role: string;
          tool_invocations: Json[] | null;
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          annotations?: Json[] | null;
          archived_at?: string | null;
          chat_id: string;
          content: string;
          created_at?: string;
          id?: string;
          position: number;
          reaction?: string | null;
          role: string;
          tool_invocations?: Json[] | null;
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          annotations?: Json[] | null;
          archived_at?: string | null;
          chat_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          position?: number;
          reaction?: string | null;
          role?: string;
          tool_invocations?: Json[] | null;
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_chat_id_fk';
            columns: ['chat_id'];
            referencedRelation: 'chats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_user_id_fk';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_workspace_id_fk';
            columns: ['workspace_id'];
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      qna_labels: {
        Row: {
          created_at: string;
          label_id: string;
          qna_id: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          label_id: string;
          qna_id: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          label_id?: string;
          qna_id?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'qna_labels_label_id_fk';
            columns: ['label_id'];
            referencedRelation: 'labels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'qna_labels_qna_id_fk';
            columns: ['qna_id'];
            referencedRelation: 'qnas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'qna_labels_workspace_id_fk';
            columns: ['workspace_id'];
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      qnas: {
        Row: {
          answer: string;
          archived_at: string | null;
          archived_by: string | null;
          content_embedding: string | null;
          content_tsvector: unknown | null;
          created_at: string;
          created_by: string | null;
          id: string;
          question: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          answer: string;
          archived_at?: string | null;
          archived_by?: string | null;
          content_embedding?: string | null;
          content_tsvector?: unknown | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          question: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          answer?: string;
          archived_at?: string | null;
          archived_by?: string | null;
          content_embedding?: string | null;
          content_tsvector?: unknown | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          question?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'qna_archived_by_fk';
            columns: ['archived_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'qna_created_by_user_id_fk';
            columns: ['created_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'qna_updated_by_user_id_fk';
            columns: ['updated_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'qna_workspace_id_fk';
            columns: ['workspace_id'];
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      role_permissions: {
        Row: {
          app_permission: Database['public']['Enums']['app_permissions'];
          app_role: Database['public']['Enums']['app_roles'];
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          app_permission: Database['public']['Enums']['app_permissions'];
          app_role: Database['public']['Enums']['app_roles'];
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          app_permission?: Database['public']['Enums']['app_permissions'];
          app_role?: Database['public']['Enums']['app_roles'];
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          app_role: Database['public']['Enums']['app_roles'];
          archived_at: string | null;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          app_role: Database['public']['Enums']['app_roles'];
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          app_role?: Database['public']['Enums']['app_roles'];
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_roles_user_id_fk';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          archived_at: string | null;
          auth_user_id: string;
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string | null;
          phone: string | null;
          status: Database['public']['Enums']['user_status'];
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          archived_at?: string | null;
          auth_user_id: string;
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string | null;
          phone?: string | null;
          status: Database['public']['Enums']['user_status'];
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          auth_user_id?: string;
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string | null;
          phone?: string | null;
          status?: Database['public']['Enums']['user_status'];
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'users_auth_user_id_fk';
            columns: ['auth_user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'users_workspace_id_fk';
            columns: ['workspace_id'];
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspaces: {
        Row: {
          archived_at: string | null;
          created_at: string;
          description: string | null;
          domain: string;
          id: string;
          instructions: string | null;
          logo_url: string | null;
          name: string;
          theme: Json | null;
          theme_color: string | null;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          description?: string | null;
          domain: string;
          id?: string;
          instructions?: string | null;
          logo_url?: string | null;
          name: string;
          theme?: Json | null;
          theme_color?: string | null;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          description?: string | null;
          domain?: string;
          id?: string;
          instructions?: string | null;
          logo_url?: string | null;
          name?: string;
          theme?: Json | null;
          theme_color?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      authorize: {
        Args: {
          workspace_id: string;
          user_id: string;
          requested_permission: Database['public']['Enums']['app_permissions'];
        };
        Returns: boolean;
      };
      custom_access_token_hook: {
        Args: {
          event: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      app_permissions:
        | 'workspaces:read'
        | 'workspaces:manage'
        | 'users:read_own'
        | 'users:read_all'
        | 'users:manage_own'
        | 'users:manage_all'
        | 'documents:read'
        | 'documents:manage_own'
        | 'documents:manage_all';
      app_roles: 'guest' | 'editor' | 'admin';
      collect_contact_tool_mode: 'escalate' | 'triage';
      envoy_openai_model: 'gpt-4o' | 'gpt-4-turbo';
      user_status: 'invited' | 'pending_approval' | 'active' | 'suspended';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] &
        PublicSchema['Views'])
    ? (PublicSchema['Tables'] &
        PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never;
