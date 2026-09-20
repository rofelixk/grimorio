import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ColorIdentity } from './color-identity';

describe('ColorIdentity', () => {
  let component: ColorIdentity;
  let fixture: ComponentFixture<ColorIdentity>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColorIdentity],
    }).compileComponents();

    fixture = TestBed.createComponent(ColorIdentity);
    component = fixture.componentInstance;
  });

  it('reports which colors are present', () => {
    fixture.componentRef.setInput('colorIdentity', ['B', 'G']);

    expect(component.isPresent('B')).toBe(true);
    expect(component.isPresent('G')).toBe(true);
    expect(component.isPresent('W')).toBe(false);
  });

  it('treats an empty color identity as colorless', () => {
    fixture.componentRef.setInput('colorIdentity', []);

    expect(component.allColors.every((c) => !component.isPresent(c))).toBe(true);
  });
});
