import en from '../locales/en.json';
import fr from '../locales/fr.json';
import es from '../locales/es.json';

const bundles: Record<string, Record<string, string>> = { en, fr, es };
let currentLocale = 'en';

export function detectLocale(): string {
  try {
    const raw = (window as any).moment?.locale?.() ?? 'en';
    const short = raw.split('-')[0];
    return short in bundles ? short : 'en';
  } catch {
    return 'en';
  }
}

export function setLocale(locale: string): void {
  currentLocale = locale in bundles ? locale : 'en';
}

export function getLocale(): string {
  return currentLocale;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const bundle = bundles[currentLocale];
  let value = bundle?.[key] ?? bundles['en']?.[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), () => String(v));
    }
  }
  return value;
}
