# Flotick Mintlify Docs

This directory contains the user-facing documentation site for Flotick, deployed via Mintlify.

## Local preview

```bash
npm i -g mint
cd Mintlify-docs
mint dev
```

Open `http://localhost:3000`.

## Content architecture

The site is organized for end users, not implementers. Top-level tabs in `docs.json`:

- `Get started`: account access, onboarding, core concepts, and navigation
- `Work`: Inbox, Projects, milestones, updates, Sprints, Tasks, files, and Project keys
- `Clients and sales`: leads, forms, clients, meetings, messages, and the public business page
- `Documents`: templates, editor, e-signature, Document studio, and business profile
- `Team`: members, permissions, attendance, leave, and payroll
- `Insights and AI`: Orbit, Analytics, AI Summaries, and scheduled reports
- `Client Portal`: what clients see, written so it can be shared with them
- `Admin and account`: settings, plans and billing, profile, and security
- `Help`: support, FAQ, glossary, feature matrix, shortcuts, and security

Source of truth for features and plan limits: `FEATURES_INVENTORY.md` in the app repo.

## Brand and styling

Colors, backgrounds, and fonts mirror the product design system (`context/design.md`):

- `docs.json` sets the functional blue (`#2563EB`), the light and dark canvas colors, and Figtree and Hahmlet fonts.
- `style.css` adds the stepped neutral surfaces, hairline borders, and 8, 12, and 16px radii.

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
