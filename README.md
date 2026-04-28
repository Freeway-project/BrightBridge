# CourseBridge

CourseBridge is a workflow and collaboration platform for Moodle to Brightspace course migration reviews.

## Project Layout

- `apps/web` - Next.js App Router web app
- `packages/workflow` - workflow roles, statuses, and transitions
- `packages/auth` - authentication helpers and permission boundaries
- `packages/validation` - shared schemas and validation logic
- `packages/storage` - file storage abstractions and metadata helpers
- `packages/ui` - shared UI components
- `packages/config` - shared TypeScript and tooling configuration
- `docs` - product, stack, and workflow notes

## Development

Install dependencies:

```sh
npm install
```

Run the web app:

```sh
npm run dev
```

The web app lives at `apps/web`.
