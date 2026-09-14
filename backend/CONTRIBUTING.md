# Contributing

## Commit messages

This project enforces [Conventional Commits](https://www.conventionalcommits.org/) via
Husky + commitlint. The `commit-msg` hook validates every commit before it's recorded.

Allowed types:

- `feat` — a new feature
- `fix` — a bug fix
- `docs` — documentation only
- `style` — formatting / whitespace
- `refactor` — code change that neither fixes a bug nor adds a feature
- `test` — adding or fixing tests
- `chore` — build / tooling / dependency changes

Example valid subjects:

```
feat: add streak counter to dashboard
fix(api): handle empty leaderboard response
docs: update README with backend setup
chore: bump prisma to 6.5
```

Subject must be lowercase and ≤100 characters.

## Pre-commit formatting

`lint-staged` runs on staged files before each commit:

- `*.{ts,tsx,js,jsx,cjs,mjs}` → `prettier --write` + `eslint --fix`
- `*.{json,md,yml,yaml,css}` → `prettier --write`

## Manual hooks

```bash
# Run lint-staged on whatever is staged right now
cd backend && npx lint-staged

# Run commitlint against a specific message
cd backend && npx commitlint --edit "your subject"

# Reinstall Husky hooks (e.g. after clone)
cd backend && npm run prepare
```

## Skipping hooks (emergency only)

```bash
git commit --no-verify -m "wip: ..."
```

CI will still run lint and commitlint, so a skipped hook will fail the PR.
