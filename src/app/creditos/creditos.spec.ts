import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import { Creditos } from './creditos';

describe('Creditos', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Creditos],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Creditos);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('mentions Scryfall and Wizards of the Coast', () => {
    const fixture = TestBed.createComponent(Creditos);
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Scryfall');
    expect(texto).toContain('Wizards of the Coast');
    expect(texto).toContain('não é produzido, endossado, apoiado ou afiliado');
  });

  it('links back to /', () => {
    const fixture = TestBed.createComponent(Creditos);
    fixture.detectChanges();
    const alvo = fixture.debugElement
      .query(By.directive(RouterLink))
      .injector.get(RouterLink).urlTree?.toString();
    expect(alvo).toBe('/');
  });
});
