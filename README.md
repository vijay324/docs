# Flotick Mintlify Docs

This directory contains the production documentation site for Flotick.

## Local preview

```bash
npm i -g mint
cd docs-main
mint dev
```

Open `http://localhost:3000`.

## Content architecture

- `index.mdx`, `quickstart.mdx`: entry pages
- `product/*`: product narrative, use cases, advantages
- `features/*`: capability deep-dives
- `platform/*`: architecture, tenancy, access, billing, super-admin
- `api/*`: auth, endpoint models, webhooks, realtime
- `operations/*`: environment, deployment, testing, security
- `reference/*`: feature matrix and operational references

## Authoring standards

- Keep language outcome-focused and role-aware.
- Align endpoint examples with actual backend route surfaces.
- Prefer stable capability documentation over transient implementation details.
- Update docs alongside feature and API behavior changes.
