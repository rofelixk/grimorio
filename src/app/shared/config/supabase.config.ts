import { InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Chave `anon`/publishable — segura para expor no bundle do navegador; quem
// protege os dados é a RLS, não o sigilo desta chave (ver CLAUDE.md). Preencha
// com os valores do seu projeto (Project Settings -> API no painel do Supabase).
const URL_SUPABASE = 'https://hyzbkxraanzhdyhtnadf.supabase.co';
const CHAVE_ANON_SUPABASE = 'sb_publishable_Nzr5sdxkABnNqABqkxgvbQ_hHsRaKYY';

export const TOKEN_CLIENTE_SUPABASE = new InjectionToken<SupabaseClient>(
  'TOKEN_CLIENTE_SUPABASE',
);

export function criarClienteSupabaseNavegador(): SupabaseClient {
  return createClient(URL_SUPABASE, CHAVE_ANON_SUPABASE);
}
