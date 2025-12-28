# OpenAPI Spec Aggregation Scripts

This directory contains scripts for aggregating OpenAPI specifications from multiple GitHub repositories and generating
audience-specific public API documentation.

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
- **Audiences**: Target audiences for generated specs (e.g., customs, lastmile)
- **Output Directory**: Where to write generated specs
- **Servers**: Per-audience server URLs for different environments
- **Tag Order**: Order in which endpoint categories appear in documentation
- **Schema/Path Prefixing**: Whether to prefix schemas and paths with service names

### Server Configuration

The `servers` object defines API server URLs for each audience. Each audience can have multiple environments (production, staging, integration, etc.):

```javascript
servers: {
    customs: [
        {
            url: 'https://api.serhafen-tech.com/customs',
            description: 'Production server',
        },
        {
            url: 'https://api-staging.serhafen-tech.com/customs',
            description: 'Staging server',
        },
    ],
    lastmile: [
        {
            url: 'https://api.serhafen-tech.com/lastmile',
            description: 'Production server',
        },
        {
            url: 'https://api-staging.serhafen-tech.com/lastmile',
            description: 'Staging server',
        },
    ],
},
```

### Tag Ordering

The `tagOrder` array controls how endpoint categories are organized in the documentation:

```javascript
tagOrder: [
    'Declarations',
    'Shipments',
    'Tracking'
]
```

Categories appear in the order listed. Any categories not in the list appear at the end, sorted alphabetically.

## Vendor Extensions

The script recognizes these OpenAPI vendor extensions:

- `x-public`: Mark an operation as public (boolean)
- `x-audience`: Specify target audience(s) (string or array)
- `x-category`: Categorize endpoint for documentation (string)

### Example

```yaml
paths:
  /declarations:
    get:
      summary: List declarations
      x-public: true
      x-audience: [ customs, lastmile ]
      x-category: Declarations
```

## Output

Generated files are written to `../specs/` by default:

- `customs-api.openapi.yaml` - Public API spec for customs audience
- `lastmile-api.openapi.yaml` - Public API spec for lastmile audience

Each generated spec includes:

- Only public operations (marked with `x-public: true`)
- Filtered by the audience
- Categorized and ordered by `x-category`
- Cleaned of internal vendor extensions
- Resolved external references

## Features

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

