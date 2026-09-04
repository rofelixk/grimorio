import { Inject, Injectable, computed, signal } from '@angular/core';
import { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { TOKEN_CLIENTE_SUPABASE } from '@shared/config';

export interface ResultadoCadastro {
  sessaoImediata: boolean;
}

@Injectable({ providedIn: 'root' })
export class AutenticacaoService {
  private readonly sessaoAtual = signal<Session | null>(null);

  readonly estaAutenticado = computed(() => this.sessaoAtual() !== null);
  readonly usuarioAtual = computed<User | null>(() => this.sessaoAtual()?.user ?? null);

  // Resolvido depois que a sessão inicial (reidratada do localStorage pelo
  // supabase-js) é conferida. Sem isso, um guard/componente que lê
  // estaAutenticado() cedo demais veria "deslogado" por engano no refresh da
  // página, antes do onAuthStateChange disparar pela primeira vez.
  readonly sessaoPronta: Promise<void>;

  constructor(
    @Inject(TOKEN_CLIENTE_SUPABASE) private readonly clienteSupabase: SupabaseClient,
  ) {
    this.sessaoPronta = this.clienteSupabase.auth.getSession().then(({ data }) => {
      this.sessaoAtual.set(data.session);
    });

    this.clienteSupabase.auth.onAuthStateChange((_evento, sessao) => {
      this.sessaoAtual.set(sessao);
    });
  }

  async cadastrar(email: string, senha: string): Promise<ResultadoCadastro> {
    const { data, error } = await this.clienteSupabase.auth.signUp({
      email,
      password: senha,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { sessaoImediata: data.session !== null };
  }

  async entrar(email: string, senha: string): Promise<void> {
    const { error } = await this.clienteSupabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async sair(): Promise<void> {
    const { error } = await this.clienteSupabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }
}
