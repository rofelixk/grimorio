import { describe, expect, it } from 'vitest';
import { LocalIdentity, reconcileIdentity } from './identity-sync.util';

const T1 = '2026-09-01T00:00:00.000Z';
const T2 = '2026-09-02T00:00:00.000Z';

const local = (patch: Partial<LocalIdentity> = {}): LocalIdentity => ({
  colors: ['U', 'R'],
  colorsUpdatedAt: T1,
  name: 'rafa',
  nameUpdatedAt: T1,
  ...patch,
});

describe('reconcileIdentity', () => {
  it('adopts newer remote colors with their timestamp', () => {
    const result = reconcileIdentity(local(), { colors: ['G'], colorsAt: T2, labelAt: T1 });
    expect(result).toEqual({ adoptColors: { colors: ['G'], at: T2 }, write: null });
  });

  it('writes local colors when the remote has none', () => {
    const result = reconcileIdentity(local(), { labelAt: T1 });
    expect(result).toEqual({ adoptColors: null, write: { grm_colors: ['U', 'R'], grm_colors_at: T1 } });
  });

  it('writes local colors when they are newer', () => {
    const result = reconcileIdentity(local({ colorsUpdatedAt: T2 }), { colors: ['G'], colorsAt: T1, labelAt: T1 });
    expect(result.write).toEqual({ grm_colors: ['U', 'R'], grm_colors_at: T2 });
    expect(result.adoptColors).toBeNull();
  });

  it('treats remote colors without a timestamp as older', () => {
    const result = reconcileIdentity(local(), { colors: ['G'], labelAt: T1 });
    expect(result.write).toMatchObject({ grm_colors: ['U', 'R'] });
  });

  it('does nothing for equal colors, whatever the timestamps', () => {
    expect(reconcileIdentity(local(), { colors: ['U', 'R'], colorsAt: T2, labelAt: T1 })).toEqual({
      adoptColors: null,
      write: null,
    });
    expect(reconcileIdentity(local({ colorsUpdatedAt: T2 }), { colors: ['U', 'R'], colorsAt: T1, labelAt: T1 }).write).toBeNull();
  });

  it('compares colors in order', () => {
    expect(reconcileIdentity(local(), { colors: ['R', 'U'], colorsAt: T2, labelAt: T1 }).adoptColors).toEqual({
      colors: ['R', 'U'],
      at: T2,
    });
  });

  it('writes the label when the remote has no label timestamp', () => {
    const result = reconcileIdentity(local(), { colors: ['U', 'R'], colorsAt: T1 });
    expect(result.write).toEqual({ grm_label: 'rafa', grm_label_at: T1 });
  });

  it('writes the label when the local rename is newer', () => {
    const result = reconcileIdentity(local({ nameUpdatedAt: T2 }), { colors: ['U', 'R'], colorsAt: T1, labelAt: T1 });
    expect(result.write).toEqual({ grm_label: 'rafa', grm_label_at: T2 });
  });

  it('never adopts the remote label', () => {
    const result = reconcileIdentity(local(), { colors: ['U', 'R'], colorsAt: T1, labelAt: T2 });
    expect(result).toEqual({ adoptColors: null, write: null });
  });

  it('writes colors and label together', () => {
    const result = reconcileIdentity(local({ colorsUpdatedAt: T2, nameUpdatedAt: T2 }), {
      colors: ['G'],
      colorsAt: T1,
      labelAt: T1,
    });
    expect(result.write).toEqual({ grm_colors: ['U', 'R'], grm_colors_at: T2, grm_label: 'rafa', grm_label_at: T2 });
  });
});
