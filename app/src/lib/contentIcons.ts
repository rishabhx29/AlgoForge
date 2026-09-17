import {
    Binary,
    Cpu,
    GitBranch,
    Network,
    Briefcase,
    Server,
    type LucideIcon,
} from 'lucide-react';

/**
 * Icon lookup for learning paths / roadmaps.
 *
 * The backend stores an icon *name* on each path; this maps it to the lucide
 * component. Shared by Roadmaps and PathDetail (previously duplicated), with a
 * fallback so an unknown name can never render `undefined` as a component.
 */
export const CONTENT_ICONS: Record<string, LucideIcon> = {
    Binary,
    Cpu,
    GitBranch,
    Network,
    Briefcase,
    Server,
};

/** Resolve an icon name to a component, falling back to `Binary`. */
export function contentIcon(name: string | undefined): LucideIcon {
    return (name && CONTENT_ICONS[name]) || Binary;
}