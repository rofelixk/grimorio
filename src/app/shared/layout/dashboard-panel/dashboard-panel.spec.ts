import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { DashboardPanel } from './dashboard-panel';

describe('DashboardPanel', () => {
  let component: DashboardPanel;
  let fixture: ComponentFixture<DashboardPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPanel],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPanel);
    fixture.componentRef.setInput('title', 'Collection');
    fixture.componentRef.setInput('viewAllLink', '/collection');
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
