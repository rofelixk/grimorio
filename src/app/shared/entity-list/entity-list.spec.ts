import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { EntityList } from './entity-list';

describe('EntityList', () => {
  let component: EntityList;
  let fixture: ComponentFixture<EntityList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityList],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(EntityList);
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('routePrefix', '/locations');
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits add with the trimmed name and resets the input', () => {
    let emitted: string | undefined;
    component.add.subscribe((name) => (emitted = name));

    component.newName.set('  Box 1  ');
    component.submitAdd();

    expect(emitted).toBe('Box 1');
    expect(component.newName()).toBe('');
  });

  it('does not emit add for a blank name', () => {
    let emitted = false;
    component.add.subscribe(() => (emitted = true));

    component.newName.set('   ');
    component.submitAdd();

    expect(emitted).toBe(false);
  });

  it('emits remove with the item id', () => {
    let emitted: string | undefined;
    component.remove.subscribe((id) => (emitted = id));

    component.remove.emit('item-1');

    expect(emitted).toBe('item-1');
  });
});
