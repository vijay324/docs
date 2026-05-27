# Flotick Mintlify Docs

This directory contains the user-facing documentation site for Flotick, deployed via Mintlify.

## Local preview

```bash
npm i -g mint
cd docs-main
mint dev
```

Open `http://localhost:3000`.

## Content architecture

The site is organized for end users, not implementers. Top-level tabs in `docs.json`:

- `Get Started` — welcome, quickstart, core concepts, sign-up, onboarding, dashboard tour
- `Features` — every user-facing capability (planning, workforce, collaboration, AI, analytics, configuration)
- `Guides` — end-to-end workflows for daily use, sprint planning, leave, payroll
- `Admin` — organization settings, policies, billing, member management, account security
- `Resources` — FAQ, glossary, feature matrix, security, support

## Authoring standards

- Write for end users learning the platform. Avoid implementation detail and internal architecture.
- Use active voice and second person ("you").
- Sentence case for headings. Bold for UI elements (`Click **Save**`). Code style for paths, fields, and commands.
- Keep pages short and skim-friendly. Lead with what the reader wants to do.
- Use Mintlify components (`Steps`, `CardGroup`, `Card`, `Tabs`, `AccordionGroup`, `Note`, `Warning`) for clarity.
- Add `[IMAGE: ...]` placeholders where a screenshot would meaningfully help.

## When updating docs

- Reflect the actual product. Keep behavior descriptions accurate to the current release.
- Update the relevant tab and group in `docs.json` if you add or move a page.
- Run `mint broken-links` before opening a PR.
