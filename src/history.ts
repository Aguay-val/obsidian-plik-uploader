export interface HistoryEntry {
	name: string;
	url: string;
	uploadId: string;
	uploadToken: string;
	uploadedAt: number;
	expiresAt: number | null;
}

export function addEntry(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
	const next = [entry, ...history];
	return next.length > 100 ? next.slice(0, 100) : next;
}

export function pruneExpired(history: HistoryEntry[], now: number): HistoryEntry[] {
	return history.filter((e) => e.expiresAt === null || e.expiresAt > now);
}
