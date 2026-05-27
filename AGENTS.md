# Documentation project instructions

## About this project

- This is the Flotick documentation site, built on [Mintlify](https://mintlify.com).
- Pages are MDX files with YAML frontmatter.
- Configuration lives in `docs.json`.
- Run `mint dev` to preview locally.
- Run `mint broken-links` to validate cross-page links.

## Audience

End users of Flotick — Admins, Managers, and Members of organizations using the product. The docs are not for Flotick employees or for implementing the product itself.

## Terminology

- **Organization** (not "tenant" or "workspace")
- **Member** (not "user")
- **Admin / Manager / Member** for the three role names; capitalize when referring to the role
- **Project / Sprint / Task** capitalized when used as a noun referring to the entity
- **Sign in / sign out / sign-up** (sign-up hyphenated only as a noun)
- Use the term "two-factor authentication" with "TOTP" or "2FA" as accepted shorthand
- "Real-time" with the hyphen
- "AI Summary", "AI Insight", "AI Enhance" — capitalized as proper feature names

## Style

- Active voice, second person.
- Sentence case for headings.
- Bold UI elements: `Click **Save**`.
- Backticks for paths, fields, statuses (`Backlog`, `In Progress`).
- One idea per sentence. Short paragraphs.
- Prefer numbered `Steps` for procedures, `AccordionGroup` for FAQs, and `CardGroup` for inline navigation.

## Image placeholders

When a screenshot or annotated image would help, write a placeholder inline:

```
[IMAGE: Short description of what the screenshot should show]
```

Maintainers replace these with real screenshots when capturing. Keep descriptions specific (page name, key elements, expected state).

## Content boundaries

- Document only user-facing surfaces in `app.flotick.com`. Do not document internal-only super admin tools.
- Avoid implementation details (API routes, database fields, internal modules) — they belong in the engineering repo, not here.
- Keep pricing references soft. Authoritative pricing lives at `flotick.com/pricing`.
- Don't document features behind a feature flag until they ship to all users on at least one plan.
