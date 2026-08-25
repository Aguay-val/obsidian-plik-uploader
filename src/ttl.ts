import { t } from './i18n';

export type TtlOption = 'day' | 'week' | 'month' | 'never';

export const TTL_SECONDS: Record<TtlOption, number> = {
	day: 86_400,
	week: 604_800,
	month: 2_592_000,
	// 0 = "server default" côté Plik (même convention que le CLI officiel) :
	// si l'admin a configuré MaxTTL=0, l'upload n'expire jamais.
	never: 0,
};

export const TTL_LABELS: Record<TtlOption, string> = {
	day: t('ttl.day'),
	week: t('ttl.week'),
	month: t('ttl.month'),
	never: t('ttl.never'),
};
