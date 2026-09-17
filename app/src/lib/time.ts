/**
 * Relative-time formatting.
 *
 * Previously duplicated as a local `timeAgo` in Dashboard and CommunityForum
 * with slightly different thresholds; this is the single shared implementation.
 */

const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const MONTH = DAY * 30;

/**
 * Format a timestamp as a short relative string ("Just now", "5m ago",
 * "3h ago", "2d ago"). Falls back to a locale date string beyond ~4 weeks.
 *
 * Invalid or missing input returns an empty string rather than "NaN ago".
 */
export function timeAgo(dateStr: string | number | Date | null | undefined): string {
    if (dateStr === null || dateStr === undefined) return '';

    const timestamp = new Date(dateStr).getTime();
    if (Number.isNaN(timestamp)) return '';

    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < MINUTE) return 'Just now';

    if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)}m ago`;
    if (seconds < DAY) return `${Math.floor(seconds / HOUR)}h ago`;

    const days = Math.floor(seconds / DAY);
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(seconds / MONTH)}mo ago`;

    return new Date(timestamp).toLocaleDateString();
}