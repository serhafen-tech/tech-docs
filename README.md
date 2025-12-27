# Serhafen Developer Documentation

This is the official developer documentation portal for Serhafen - your gateway to Latin America logistics and customs services.

## Overview

This documentation site provides comprehensive API documentation for:
- **Customs API**: Streamline customs clearance processes across Latin American borders
- **Lastmile API**: Complete last-mile delivery and logistics management

Built with [Docusaurus](https://docusaurus.io/) and [Redocusaurus](https://github.com/rohit-gohri/redocusaurus) for OpenAPI documentation.

## Prerequisites

- Node.js >= 20.0
- npm or yarn

## Installation

```bash
npm install
```

Or with yarn:

```bash
yarn
```

## Local Development

Start the development server:

```bash
npm start
```

Or with yarn:

```bash
yarn start
```

This command starts a local development server at `http://localhost:3000` and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

Generate static content for production:

```bash
npm run build
```

Or with yarn:

```bash
yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Type Checking

Run TypeScript type checking:

```bash
npm run typecheck
```

## Project Structure

```
docs/
├── specs/                    # OpenAPI specifications
│   ├── customs.openapi.yml   # Customs API spec
│   └── lastmile.openapi.yml  # Lastmile API spec
├── src/
│   ├── components/           # React components
│   ├── css/                  # Custom styles
│   └── pages/                # Custom pages
├── static/                   # Static assets
└── docusaurus.config.ts      # Docusaurus configuration
```

## API Documentation

The API documentation is automatically generated from OpenAPI specifications located in the `specs/` directory:

- **Customs API**: Available at `/api/customs`
- **Lastmile API**: Available at `/api/lastmile`

To update API documentation, modify the respective OpenAPI YAML files in the `specs/` directory.

## Contributing

When adding or updating API documentation:

1. Update the OpenAPI specification files in `specs/`
2. Test locally with `npm start`
3. Run type checking with `npm run typecheck`
4. Build to verify production output with `npm run build`

## License

Copyright © 2025 Serhafen. All rights reserved.
