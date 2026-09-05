import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Baralhos } from './baralhos';
import { BaralhosService } from '@shared/services';
import { IBaralho } from '@shared/interfaces';

function baralhoExemplo(sobrescritas: Partial<IBaralho.Detalhes> = {}): IBaralho.Detalhes {
  return {
    id: '1',
    user_id: 'u1',
    name: 'Reanimator',
    commander_oracle_id: null,
    format: 'commander',
    created_at: '2026-01-01',
    ...sobrescritas,
  };
}

describe('Baralhos', () => {
  let baralhosServiceMock: { listarBaralhos: jest.Mock };

  beforeEach(async () => {
    baralhosServiceMock = { listarBaralhos: jest.fn().mockResolvedValue([]) };

    await TestBed.configureTestingModule({
      imports: [Baralhos],
      providers: [provideRouter([]), { provide: BaralhosService, useValue: baralhosServiceMock }],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Baralhos);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the Decks title', () => {
    const fixture = TestBed.createComponent(Baralhos);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Baralhos');
  });

  it('lists the user decks on init', async () => {
    baralhosServiceMock.listarBaralhos.mockResolvedValue([baralhoExemplo()]);

    const fixture = TestBed.createComponent(Baralhos);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Reanimator');
  });

  it('shows a message when there are no decks', async () => {
    const fixture = TestBed.createComponent(Baralhos);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('não tem nenhum baralho');
  });

  it('opens the create modal when "Criar baralho" is clicked', () => {
    const fixture = TestBed.createComponent(Baralhos);
    fixture.detectChanges();

    const botao = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Criar baralho',
    ) as HTMLButtonElement;
    botao.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-modal-baralho')).not.toBeNull();
  });

  it('has a back button', () => {
    const fixture = TestBed.createComponent(Baralhos);
    fixture.detectChanges();
    const labels = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) =>
      (b as HTMLButtonElement).textContent?.trim(),
    );
    expect(labels).toContain('Voltar');
  });

  it('shows the error message when loading decks fails', async () => {
    baralhosServiceMock.listarBaralhos.mockRejectedValue(new Error('permission denied'));

    const fixture = TestBed.createComponent(Baralhos);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.erro')?.textContent).toContain('permission denied');
  });
});
