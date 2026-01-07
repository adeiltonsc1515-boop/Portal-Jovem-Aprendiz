
import { createClient } from '@supabase/supabase-js';

// URL do seu projeto Supabase
const supabaseUrl = 'https://sefbxziixaqieoegzyaw.supabase.co';

/**
 * Chave de acesso. 
 * Nota: Certifique-se de que esta é a 'anon public' key no painel do Supabase.
 */
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZmJ4emlpeGFxaWVvZWd6eWF3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYzNTM5MywiZXhwIjoyMDgzMjExMzkzfQ.Xw0Uy5VnweOwFfWrzVJASjRCJdg7OLRfNloMhNbEitc'; 

export const supabase = createClient(supabaseUrl, SUPABASE_ANON_KEY);

/**
 * Verifica se a URL do Supabase está acessível pelo navegador do usuário.
 * Útil para detectar AdBlockers ou bloqueios de rede.
 */
export const checkSupabaseConnection = async (): Promise<{ ok: boolean; error?: string }> => {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: { 'apikey': SUPABASE_ANON_KEY }
    });
    return { ok: response.ok };
  } catch (err: any) {
    return { 
      ok: false, 
      error: err.message === 'Failed to fetch' 
        ? 'A conexão foi bloqueada pelo navegador. Verifique seu AdBlock ou VPN.' 
        : err.message 
    };
  }
};

export const isKeyConfigured = () => !!SUPABASE_ANON_KEY;
