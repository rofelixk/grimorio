import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Decks } from './decks';

describe('Decks', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Decks],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Decks);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the Decks title', () => {
    const fixture = TestBed.createComponent(Decks);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Decks');
  });

  it('has a back button', () => {
    const fixture = TestBed.createComponent(Decks);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')?.textContent?.trim()).toBe('Back');
  });
});
