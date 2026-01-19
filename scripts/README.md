# OpenAPI Spec Aggregation Scripts

This directory contains scripts for aggregating OpenAPI specifications from multiple GitHub repositories and generating
audience-specific public API documentation with per-endpoint server configuration.

## Prerequisites

- Node.js >= 20.0
- GitHub Personal Access Token with repo access

## Setup

1. Install dependencies:

    ```bash
    npm install
    ```

2. Set up your GitHub token:

    ```bash
    export GITHUB_TOKEN=your_github_personal_access_token
    ```

## Usage

### Basic Usage

Run with default settings (fetches from `main` branch):

   ```bash
   npm run aggregate
   ```

Or directly:

   ```bash
   node aggregate-spec.js
   ```

### Specify a Branch

Fetch specs from a specific branch:

   ```bash
   node aggregate-spec.js --branch develop
   ```

Short form:

   ```bash
   node aggregate-spec.js -b develop
   ```

## Command Line Options

| Option     | Short | Description                    | Default |
|------------|-------|--------------------------------|---------|
| `--branch` | `-b`  | Git branch to fetch specs from | `main`  |

## Configuration

Edit the `CONFIG` object in `aggregate-spec.js` to configure:

- **Services**: GitHub repositories to fetch specs from
- **Audiences**: Target audiences for generated specs (e.g., customs, lastmile, auth)
- **Output Directory**: Where to write generated specs
- **Default Servers**: Fallback server URLs when source files don't define servers
- **Tag Order**: Order in which endpoint categories appear in documentation
- **Schema/Path Prefixing**: Whether to prefix schemas and paths with service names

### Service Configuration

Services are configured simply with repository information. Server URLs are automatically extracted from the source
OpenAPI files:

```javascript
services: [
    {
        name: 'customs-declaration',
        repo: 'serhafen-tech/customs-declaration',
        specsPath: 'specs',
    },
    {
        name: 'iam',
        repo: 'serhafen-tech/iam-service',
        specsPath: 'specs',
    }
],
```

### Server Configuration

The script automatically uses servers defined in the source OpenAPI files. Each operation gets the servers from its
source file:

**Source File Example (auth-api.openapi.yaml):**

```yaml
openapi: 3.0.3
servers:
  - url: https://auth.example.com
    description: Authentication service
  - url: https://auth-staging.example.com
    description: Staging authentication service

paths:
  /login:
    post:
      x-public: true
      x-audience: auth
      x-category: Authentication
```

**Generated Output:**

```yaml
paths:
  /login:
    post:
      # ... operation details
      servers:
        - url: https://auth.example.com
          description: Authentication service
        - url: https://auth-staging.example.com
          description: Staging authentication service
```

### Default Servers

Configure fallback servers used when source files don't define servers:

```javascript
defaultServers: [
    {
        url: 'https://api.serhafen-tech.com',
        description: 'Production server',
    },
    {
        url: 'https://api-staging.serhafen-tech.com',
        description: 'Staging server',
    },
],
```

### Server Priority

Servers are applied in this priority order:

1. **`x-servers`** - Endpoint-level override (highest priority)
2. **Source file servers** - Extracted from original OpenAPI specs (normal case)
3. **Default servers** - Fallback configuration (lowest priority)

### Tag Ordering

The `tagOrder` array controls how endpoint categories are organized in the documentation:

```javascript
tagOrder: [
    'Authentication',
    'Declarations',
    'Shipments',
    'Tracking'
]
```

Categories appear in the order listed. Any categories not in the list appear at the end, sorted alphabetically.

## Vendor Extensions

The script recognizes these OpenAPI vendor extensions:

- `x-public`: Mark an operation as public (boolean)
- `x-audience`: Specify target audience(s) (string, comma-separated string, or array)
- `x-category`: Categorize endpoint for documentation (string)
- `x-servers`: Override servers for specific endpoints (array, optional)

### Audience Formats

The script supports multiple formats for `x-audience`:

   ```yaml
   # Single audience
   x-audience: auth

   # Multiple audiences (array - recommended)
   x-audience: [ auth, customs ]

   # Multiple audiences (comma-separated string - also supported)
   x-audience: auth,customs

   # Mixed whitespace handling
   x-audience: auth, customs, lastmile
   ```

### Example

```yaml
paths:
  /declarations:
    get:
      summary: List declarations
      x-public: true
      x-audience: [ customs, lastmile ]
      x-category: Declarations

  /special-auth:
    post:
      summary: Special authentication endpoint
      x-public: true
      x-audience: auth
      x-category: Authentication
      x-servers:
        - url: https://special-auth.example.com
          description: Special authentication server
```

## Output

Generated files are written to `../specs/` by default:

- `customs-api.openapi.yaml` - Public API spec for customs audience
- `lastmile-api.openapi.yaml` - Public API spec for lastmile audience
- `auth-api.openapi.yaml` - Public API spec for auth audience

Each generated spec includes:

- Only public operations (marked with `x-public: true`)
- Filtered by the audience
- Categorized and ordered by `x-category`
- Per-operation server configuration
- Cleaned of internal vendor extensions
- Resolved external references
- No global servers section

## Features

### Server Management

- **Automatic Extraction**: Servers are automatically extracted from source OpenAPI files
- **Per-Operation Servers**: Each operation gets its own servers section
- **Source of Truth**: Server URLs are maintained in the original OpenAPI files
- **Override Support**: Use `x-servers` for special endpoint routing
- **No Global Servers**: Generated specs have no global servers section

### Tag Management

- Uses only `x-category` for public documentation tags
- Internal spec tags are removed to keep public docs clean
- Single tag per operation for clear organization

### Schema Management

- Automatically resolves `$ref` references
- Removes unused schemas
- Optional service-name prefixing for multiservice specs

### Path Management

- Optional service-name prefixing for multiservice aggregation
- Alphabetical sorting within tag groups
- Configurable prefixing behavior (auto-detect, force on/off)

### Audience Matching

- Flexible audience format support (string, array, comma-separated)
- Automatic whitespace trimming
- Consistent matching logic across the codebase

## Troubleshooting

### Authentication Errors

If you see `401` errors:

```
Error fetching specs from repository: Request failed with status code 401
```

Make sure your `GITHUB_TOKEN` environment variable is set correctly:

```bash
echo $GITHUB_TOKEN  # Should output your token
```

### Branch Not Found

If specs aren't found:

```
⚠ No spec files found in repository/path
```

Verify:

1. The branch exists in the repository
2. The `specsPath` is correct in the CONFIG
3. There are `.yaml` or `.yml` files in that path

### Missing Categories

If you see warnings like:

```
⚠ Warning: GET /path is public but has no x-category defined
```

Add an `x-category` to the operation in the source spec:

```yaml
x-category: YourCategory
```

### Audience Matching Issues

If operations are being skipped with messages like:

```
Skipped POST /endpoint: audience 'auth' not in x-audience: [auth,customs]
```

Check your `x-audience` format in the source spec. The script supports:

- Arrays: `x-audience: [auth, customs]` (recommended)
- Comma-separated: `x-audience: auth,customs` (supported)
- Single values: `x-audience: auth` (supported)

### Server Configuration

Operations automatically get servers from their source OpenAPI file. If you need different servers for specific
endpoints, use the `x-servers` extension:

```yaml
x-servers:
  - url: https://special.example.com
    description: Special server for this endpoint
```

