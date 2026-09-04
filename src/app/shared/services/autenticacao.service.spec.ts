import { TestBed } from '@angular/core/testing';
import { AutenticacaoService } from './autenticacao.service';
import { TOKEN_CLIENTE_SUPABASE } from '@shared/config';

function configurarServico(sessaoInicial: unknown = null) {
  const callbacksAuthStateChange: Array<(evento: string, sessao: unknown) => void> = [];

  const clienteMock = {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: sessaoInicial } }),
      onAuthStateChange: jest.fn((callback: (evento: string, sessao: unknown) => void) => {
        callbacksAuthStateChange.push(callback);
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  };

  TestBed.configureTestingModule({
    providers: [
      AutenticacaoService,
      { provide: TOKEN_CLIENTE_SUPABASE, useValue: clienteMock },
    ],
  });

  return { servico: TestBed.inject(AutenticacaoService), clienteMock, callbacksAuthStateChange };
}

describe('AutenticacaoService', () => {
  it('starts unauthenticated and resolves sessaoPronta with no initial session', async () => {
    const { servico } = configurarServico(null);
    await servico.sessaoPronta;

    expect(servico.estaAutenticado()).toBe(false);
    expect(servico.usuarioAtual()).toBeNull();
  });

  it('reflects an existing session once sessaoPronta resolves', async () => {
    const sessaoFalsa = { user: { email: 'ash@example.com' } };
    const { servico } = configurarServico(sessaoFalsa);
    await servico.sessaoPronta;

    expect(servico.estaAutenticado()).toBe(true);
    expect(servico.usuarioAtual()).toEqual(sessaoFalsa.user);
  });

  it('updates state when onAuthStateChange fires', async () => {
    const { servico, callbacksAuthStateChange } = configurarServico(null);
    await servico.sessaoPronta;
    expect(servico.estaAutenticado()).toBe(false);

    callbacksAuthStateChange[0]('SIGNED_IN', { user: { email: 'ash@example.com' } });

    expect(servico.estaAutenticado()).toBe(true);
  });

  it('cadastrar returns sessaoImediata true when signUp returns a session', async () => {
    const { servico, clienteMock } = configurarServico(null);
    clienteMock.auth.signUp.mockResolvedValue({ data: { session: {} }, error: null });

    const resultado = await servico.cadastrar('ash@example.com', 'senha123');

    expect(clienteMock.auth.signUp).toHaveBeenCalledWith({
      email: 'ash@example.com',
      password: 'senha123',
    });
    expect(resultado).toEqual({ sessaoImediata: true });
  });

  it('cadastrar returns sessaoImediata false when signUp requires email confirmation', async () => {
    const { servico, clienteMock } = configurarServico(null);
    clienteMock.auth.signUp.mockResolvedValue({ data: { session: null }, error: null });

    const resultado = await servico.cadastrar('ash@example.com', 'senha123');

    expect(resultado).toEqual({ sessaoImediata: false });
  });

  it('cadastrar throws with the Supabase error message on failure', async () => {
    const { servico, clienteMock } = configurarServico(null);
    clienteMock.auth.signUp.mockResolvedValue({
      data: { session: null },
      error: { message: 'User already registered' },
    });

    await expect(servico.cadastrar('ash@example.com', 'senha123')).rejects.toThrow(
      'User already registered',
    );
  });

  it('entrar calls signInWithPassword and throws on failure', async () => {
    const { servico, clienteMock } = configurarServico(null);
    clienteMock.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });

    await expect(servico.entrar('ash@example.com', 'senhaerrada')).rejects.toThrow(
      'Invalid login credentials',
    );
    expect(clienteMock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'ash@example.com',
      password: 'senhaerrada',
    });
  });

  it('sair calls signOut and throws on failure', async () => {
    const { servico, clienteMock } = configurarServico(null);
    clienteMock.auth.signOut.mockResolvedValue({ error: { message: 'Network error' } });

    await expect(servico.sair()).rejects.toThrow('Network error');
  });
});
