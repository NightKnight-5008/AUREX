import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'aurex-web',
    },
  },
});

// Helper functions for common operations
export const supabaseHelpers = {
  // User operations
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // Credit cards operations
  async getUserCards(userId: string) {
    const { data, error } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Transactions operations
  async getUserTransactions(userId: string, limit = 50) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, credit_cards(*)')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  // SMS logs operations
  async getUserSmsLogs(userId: string, limit = 100) {
    const { data, error } = await supabase
      .from('sms_logs')
      .select('*')
      .eq('user_id', userId)
      .order('received_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },
};
