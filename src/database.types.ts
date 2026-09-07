// Database row shapes matching supabase/schema.sql.
// Kept lightweight (row types only) — generated via `supabase gen types` when the
// Supabase CLI + project link become available.

export interface ClassRow {
  id: string;
  name: string;
  student_count: number;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  assigned_class: string | null;
  updated_at: string;
}

export interface RegistrationRow {
  id: string;
  class_name: string;
  date: string;
  meal_type: string;
  count: number;
  registered_by: string | null;
  registered_by_id: string | null;
  updated_at: string;
}

export interface AnnouncementRow {
  id: string;
  title: string;
  content: string;
  created_at: string;
  created_by: string | null;
  created_by_id: string | null;
  read_by: string[];
}

export interface AuditLogRow {
  id: string;
  timestamp: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  details: Record<string, unknown> | null;
}

export interface ArchivedRegistrationRow {
  id: string;
  class_name: string;
  date: string;
  meal_type: string;
  count: number;
  registered_by: string | null;
  registered_by_id: string | null;
  updated_at: string | null;
}
