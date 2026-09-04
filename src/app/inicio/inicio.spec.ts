import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Inicio } from './inicio';
import { CartasService } from '@shared/services';

describe('Inicio', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [
        provideRouter([]),
        { provide: CartasService, useValue: { buscarCartas: jest.fn() } },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Inicio);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the shared card search', () => {
    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-busca-cartas')).not.toBeNull();
  });
});
