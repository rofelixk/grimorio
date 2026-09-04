import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import { Home } from './home';

describe('Home', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Home);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render Decks and Collection buttons', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const labels = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) =>
      (b as HTMLButtonElement).textContent?.trim(),
    );
    expect(labels).toEqual(['Decks', 'Collection']);
  });

  it('links the buttons to the /decks and /collection routes', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const targets = fixture.debugElement
      .queryAll(By.directive(RouterLink))
      .map((el) => el.injector.get(RouterLink).urlTree?.toString());
    expect(targets).toEqual(['/decks', '/collection']);
  });
});
