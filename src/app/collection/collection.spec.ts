import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Collection } from './collection';

describe('Collection', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Collection],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Collection);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the Collection title', () => {
    const fixture = TestBed.createComponent(Collection);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Collection');
  });

  it('has a back button', () => {
    const fixture = TestBed.createComponent(Collection);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')?.textContent?.trim()).toBe('Back');
  });
});
