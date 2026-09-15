/**
 * Prisma error helpers.
 *
 * WHY THIS EXISTS
 * `authController.ts` guards its inserts with a `findUnique` pre-check. That is a
 * check-then-insert pattern and therefore racy: two concurrent requests can both pass
 * the check and both attempt the insert. Historically the loser simply created a
 * duplicate document, because the schema's `@unique` declarations were unenforced in
 * MongoDB (see `scripts/auditConstraints.ts`).
 *
 * As of 2026-09-13 those unique indexes DO exist, so the loser now raises a Prisma
 * unique-constraint violation (P2002) instead of silently duplicating. Without handling
 * it, the catch-all in the controller turns a predictable, benign race into a **500** —
 * a server error for a client-side duplicate. These helpers let the controllers treat
 * that case as the ordinary "already exists" / "re-read and continue" outcome it is.
 */
import { Prisma } from '@prisma/client';

/**
 * True when `error` is a Prisma unique-constraint violation (P2002).
 *
 * `field` is optional and, when given, checks that the violation names that field.
 * On MongoDB the reported `meta.target` is not always the plain field name (it can be
 * an index or constraint name such as `User_email_key`), so the match is a substring
 * test — and when `target` is absent we still report `true` rather than risk a false
 * negative, because a P2002 on an insert of one row is unambiguous in practice.
 */
export function isUniqueViolation(error: unknown, field?: string): boolean {
    const e = error as { code?: string; meta?: { target?: unknown } } | null;
    if (!e || e.code !== 'P2002') return false;
    if (!field) return true;

    const target = e.meta?.target;
    if (Array.isArray(target)) return target.some((t) => String(t).includes(field));
    if (typeof target === 'string') return target.includes(field);
    return true;
}

/** Narrowing helper for `instanceof` checks without importing the class at each call site. */
export function isKnownRequestError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError;
}
