import { describe, it, expect, beforeEach } from 'vitest';
import { t, detectLocale, setLocale, getLocale } from '../src/i18n';

describe('i18n', () => {
  beforeEach(() => {
    setLocale('en');
  });

  it('returns key when translation missing', () => {
    setLocale('en');
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('translates known key', () => {
    setLocale('en');
    expect(t('settings.serverUrl')).toBe('Server URL');
  });

  it('interpolates params', () => {
    setLocale('en');
    expect(t('sidebar.daysLeft', { days: 3 })).toBe('3d left');
  });

  it('does not corrupt values containing $', () => {
    setLocale('en');
    expect(t('client.error', { status: 404, detail: 'budget$&.md' })).toContain('budget$&.md');
  });

  it('falls back to en when key missing in current locale', () => {
    setLocale('fr');
    const result = t('client.error', { status: 404, detail: '' });
    expect(result).toContain('404');
  });

  it('setLocale / getLocale round-trips', () => {
    setLocale('es');
    expect(getLocale()).toBe('es');
  });

  it('detectLocale returns a string', () => {
    const loc = detectLocale();
    expect(typeof loc).toBe('string');
    expect(['en', 'fr', 'es']).toContain(loc);
  });
});
