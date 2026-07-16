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

The site is organized for clients and workspace users, not implementers. Top-level tabs in `docs.json`:

- `Get started` account access, onboarding, core concepts, and navigation
- `Work management` personal work, delivery planning, collaboration, and Env Storage
- `Team operations` attendance, leave, members, permissions, and policies
- `Insights and AI` Analytics, reports, Orbit, and AI-assisted workflows
- `Admin and account` organization configuration, plans, billing, security, and recovery
- `Help` feature requests, availability, security, FAQ, glossary, and support

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
