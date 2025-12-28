# Serhafen Developer Documentation

This is the official developer documentation portal for Serhafen - your gateway to Latin America logistics and customs
services.

## Overview

This documentation site provides comprehensive API documentation for:

- **Customs API**: Streamline customs clearance processes across Latin American borders
- **Lastmile API**: Complete last-mile delivery and logistics management

Built with [Docusaurus](https://docusaurus.io/) and [Redocusaurus](https://github.com/rohit-gohri/redocusaurus) for
OpenAPI documentation.

## What This Site Does

This is a **public API documentation portal** that:

- **Consolidates** all Serhafen service APIs into one place
- **Stays in sync** automatically – when developers update their API specs, the docs update too
- **Provides interactive documentation** where you can explore endpoints, request/response formats, and even try out API
  calls

Think of it as a single source of truth for all our API documentation, always up to date without manual intervention.

Currently available APIs:

- **Customs API**: Available at `/api/customs` - Streamline customs clearance processes
- **Lastmile API**: Available at `/api/lastmile` - Complete last-mile delivery and logistics

### Beyond API Documentation

While this portal currently focuses on API contracts, **Docusaurus is a powerful framework** that can host all types of documentation:

- **Guides and Tutorials**: Step-by-step walkthroughs for common tasks
- **Architecture Documentation**: System design, data flows, and technical decisions
- **Integration Guides**: How to integrate with Serhafen services
- **SDK Documentation**: Client library references and examples
- **Best Practices**: Development standards and conventions
- **Release Notes**: Change logs and version history

This portal can evolve into **a comprehensive documentation hub** for all Serhafen technical content, not just API specifications.

## Getting Started

### Prerequisites

- Node.js >= 20.0
- npm or yarn

### Installation

```bash
npm install
```

### Local Development

Start the development server:

```bash
npm start
```

This opens `http://localhost:3000` in your browser. Any changes you make to content or specs are reflected immediately.

### Build for Production

Generate the static site for deployment:

```bash
npm run build
```

This creates optimized static files in the `build/` directory ready to be deployed to any web host.

### Type Checking

Run TypeScript type checking:

```bash
npm run typecheck
```

## How It Works

### Spec Files

OpenAPI specification files live in the `specs/` directory. Each file describes a complete API:

- Available endpoints (e.g., `/declarations`, `/shipments`)
- Request and response formats
- Authentication requirements
- Error codes and messages

Example specs in this repo:

- `specs/customs-api.openapi.yaml` - Customs clearance API
- `specs/lastmile-api.openapi.yaml` - Last-mile delivery API

> **Note**: These specs are automatically aggregated and filtered from service repositories. For details on how specs
> are fetched, filtered for public consumption, and organized by audience, see
> the [scripts/README.md](scripts/README.md).

### Configuration

The `docusaurus.config.ts` file tells Docusaurus how to render each spec:

```typescript
specs: [
    {
        spec: 'specs/customs-api.openapi.yaml',  // Path to spec file
        route: '/api/customs/',                   // URL where docs appear
    },
    {
        spec: 'specs/lastmile-api.openapi.yaml',
        route: '/api/lastmile/',
    },
]
```

When you build or run the site, Docusaurus:

1. Reads each spec file
2. Passes it to the Redoc renderer
3. Creates a beautiful, interactive documentation page at the specified route

### Interactive Documentation

The rendered documentation includes:

- **Endpoint list**: All available API operations organized by category
- **Request details**: Parameters, headers, request body schemas
- **Response details**: Success and error response formats with examples
- **Authentication**: Security requirements for each endpoint
- **Try it out**: Interactive console to test API calls (if configured)
- **Search**: Full-text search across all documentation

## Spec Management

The OpenAPI specs in the `specs/` directory are automatically managed – aggregated from service repositories, filtered
for public APIs (using `x-public`), organized by audience (using `x-audience`), and categorized using `x-category` for
clean navigation.

For complete details on how specs are fetched, filtered, categorized, and configured, see the *
*[scripts/README.md](scripts/README.md)** documentation.

## Contributing

When making changes to the documentation:

1. Test locally with `npm start`
2. Run type checking with `npm run typecheck`
3. Build to verify production output with `npm run build`

To add new API documentation, see the "Adding Documentation for a New Service" section above.

## License

Copyright © 2025 Serhafen. All rights reserved.
