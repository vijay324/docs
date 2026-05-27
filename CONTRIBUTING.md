# Contribute to the Flotick docs

We welcome corrections, clarifications, and improvements to the user-facing docs.

## How to contribute

### Edit on GitHub

1. Open the page you want to fix and click the pencil icon
2. Edit the MDX in your fork
3. Open a pull request with a short summary

### Local development

1. Fork and clone this repository
2. Install the Mintlify CLI: `npm i -g mint`
3. Create a branch: `git checkout -b fix/typo-in-attendance`
4. From `docs-main`, run `mint dev`
5. Preview at `http://localhost:3000`
6. Commit and open a pull request

## What we accept

- Typo and grammar fixes
- Clarifications for confusing instructions
- Updated screenshots (replacing `[IMAGE: ...]` placeholders)
- New how-to guides for real workflows in the product
- Corrections to feature behavior that's drifted from the docs

## What we don't accept (in this repo)

- Internal architecture, API specs, or database schema
- Pricing details that conflict with `flotick.com/pricing`
- Documentation for unreleased features
- Marketing copy or testimonials

## Writing standards

- **Active voice, second person.** "Click **Save**" not "The Save button should be clicked."
- **One idea per sentence.** Break up compound sentences.
- **Sentence case for headings.**
- **Bold UI labels.** Backticks for paths, fields, and statuses.
- **Lead with the goal.** Start a procedure with what the reader wants to accomplish.
- **Short paragraphs.** Two to three sentences is plenty.

## Mintlify components to know

- `<Steps>` for numbered procedures
- `<CardGroup>` and `<Card>` for inline navigation grids
- `<Tabs>` for parallel tracks (e.g., Admin vs Member views)
- `<AccordionGroup>` and `<Accordion>` for FAQ-style content
- `<Note>` and `<Warning>` for callouts

## Reviewing your change

- Run `mint broken-links` to catch broken cross-page links
- Open every page you've changed and read it top to bottom
- If you've added a page, also update `docs.json` so it appears in the nav
