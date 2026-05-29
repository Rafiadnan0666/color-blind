import type { SupabaseClient, Session, User } from '@supabase/supabase-js';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      getSession: () => Promise<Session | null>;
      safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
    }
    interface PageData {
      session: Session | null;
      user?: User | null;
      supabase?: SupabaseClient;
      cookies?: Array<{ name: string; value: string }>;
    }
    // interface Error {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
