/**
 * idGuard — validate a route id before handing it to Prisma.
 *
 * WHY THIS EXISTS
 * The backend runs Prisma against MongoDB, where `_id` is an ObjectId. Prisma's
 * `findUnique({ where: { id } })` does *not* return null for a malformed id — it
 * **throws** `PrismaClientKnownRequestError` (P2023, "Malformed ObjectID").
 *
 * The controllers all wrap their work in `try/catch` and return 500 from the
 * catch, so before this guard every request to `/api/forum/anything-not-an-objectid`
 * produced:
 *
 *     HTTP 500 {"message":"Failed to fetch post"}
 *
 * plus a logged stack trace. Measured on 2026-09-12: `/api/forum/posts`, `abc`,
 * `not-a-real-id` and `1234567890123` all returned 500, while a well-formed but
 * absent ObjectId correctly returned 404.
 *
 * A 500 is the wrong answer twice over: the request is a client mistake, not a
 * server fault, and the noise buries genuine errors in the log. The correct
 * response is 404 — the resource cannot exist if the id is not a valid id.
 *
 * This is a *shape* check, not an existence check. A well-formed id that matches
 * no document still falls through to the controller's own `if (!record)` branch,
 * which already returns 404 correctly.
 */

/**
 * Prisma + MongoDB ObjectId shapes.
 * - `objectId`: 24 lowercase/uppercase hex chars — the normal case.
 * - `uuid`: tolerated so this guard does not break if the schema moves to the
 *   `@default(uuid())` strategy that Prisma uses for some providers.
 */
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isValidId(value: unknown): value is string {
    return typeof value === 'string' && (OBJECT_ID.test(value) || UUID.test(value));
}

/**
 * Return true when the id is unusable — in which case a 404 has already been
 * sent and the caller must return immediately.
 *
 * Usage:
 *
 *     const post = await prisma.forumPost.findUnique({ where: { id: req.params.id } });
 *
 * becomes
 *
 *     const { id } = req.params;
 *     if (rejectInvalidId(id, res)) return;
 *     const post = await prisma.forumPost.findUnique({ where: { id } });
 */
export function rejectInvalidId(id: unknown, res: {
    status: (code: number) => { json: (body: unknown) => unknown };
}): boolean {
    if (isValidId(id)) return false;
    res.status(404).json({ message: 'Not found' });
    return true;
}
