const axios = require('axios');
const yaml = require('js-yaml');
const fs = require('fs').promises;
const path = require('path');

// Constants
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const VENDOR_EXTENSIONS = {
    PUBLIC: 'x-public',
    AUDIENCE: 'x-audience',
    CATEGORY: 'x-category',
    SERVERS: 'x-servers',
};
const OPENAPI_VERSION = '3.1.0';
const GITHUB_API_ACCEPT_HEADER = 'application/vnd.github.v3+json';

function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {
        branch: 'main', // default branch
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--branch' || args[i] === '-b') {
            parsed.branch = args[i + 1];
            i++; // skip the next argument
        }
    }

    return parsed;
}

const CLI_ARGS = parseArgs();

// Configuration
const CONFIG = {
    services: [
        {
            name: 'customs-declaration',
            repo: 'serhafen-tech/customs-declaration',
            specsPath: 'specs',
        },
        {
            name: 'cbt-docs',
            repo: 'serhafen-tech/cbt-docs',
            specsPath: 'specs',
        },
        {
            name: 'iam',
            repo: 'serhafen-tech/iam-service',
            specsPath: 'specs',
        }
    ],
    audiences: ['customs', 'lastmile', 'cross-border'],
    outputDir: '../specs',
    githubToken: process.env.GITHUB_TOKEN,
    prefixSchemas: false,
    prefixPaths: false,
    branch: CLI_ARGS.branch, // branch to fetch from (can be overridden via CLI)
    // Default servers used as fallback if the service doesn't define any
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
    tagOrder: [
        'Declarations',
        'Shipments',
        'Tracking'
    ],
};

function validateConfig() {
    if (!CONFIG.githubToken) {
        throw new Error('GITHUB_TOKEN environment variable is required');
    }
    if (!CONFIG.services || CONFIG.services.length === 0) {
        throw new Error('At least one service must be configured');
    }
    if (!CONFIG.audiences || CONFIG.audiences.length === 0) {
        throw new Error('At least one audience must be configured');
    }
}

function shouldPrefix(configValue) {
    if (configValue === true) return true;
    if (configValue === false) return false;
    return CONFIG.services.length > 1;
}

function shouldPrefixSchemas() {
    return shouldPrefix(CONFIG.prefixSchemas);
}

function shouldPrefixPaths() {
    return shouldPrefix(CONFIG.prefixPaths);
}

function getGithubHeaders() {
    return {
        Authorization: `token ${CONFIG.githubToken}`,
        Accept: GITHUB_API_ACCEPT_HEADER,
    };
}

function isSpecFile(fileName) {
    return fileName.endsWith('.yml') || fileName.endsWith('.yaml');
}

async function fetchFileFromRepo(repo, filePath, branch = 'main') {
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;

    try {
        const response = await axios.get(apiUrl, {
            headers: getGithubHeaders(),
            params: {ref: branch},
        });

        const contentResponse = await axios.get(response.data.download_url);
        return yaml.load(contentResponse.data);
    } catch (error) {
        console.error(`Error fetching file ${filePath} from ${repo}:`, error.message);
        return null;
    }
}

async function resolveExternalRefs(content, repo, specsPath, branch = 'main', resolvedCache = new Map()) {
    const contentStr = JSON.stringify(content);
    const externalRefPattern = /"\$ref"\s*:\s*"(\.[^"]+)"/g;
    const matches = [...contentStr.matchAll(externalRefPattern)];

    if (matches.length === 0) {
        return content;
    }

    console.log(`    Found ${matches.length} external reference(s) to resolve`);

    const uniqueFiles = new Set();
    for (const match of matches) {
        const fullRef = match[1];
        const filePath = fullRef.split('#')[0];
        uniqueFiles.add(filePath);
    }

    for (const relativeFilePath of uniqueFiles) {
        const fullPath = path.posix.join(specsPath, relativeFilePath);

        if (!resolvedCache.has(fullPath)) {
            console.log(`      Fetching referenced file: ${relativeFilePath}`);
            const referencedContent = await fetchFileFromRepo(repo, fullPath, branch);
            if (referencedContent) {
                resolvedCache.set(fullPath, referencedContent);
            }
        }
    }

    let resolvedContent = JSON.parse(contentStr);

    async function replaceRefs(obj) {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return Promise.all(obj.map(item => replaceRefs(item)));
        }

        if (obj.$ref && typeof obj.$ref === 'string' && obj.$ref.startsWith('./')) {
            const fullRef = obj.$ref;
            const [relativeFilePath, jsonPointer] = fullRef.split('#');
            const fullPath = path.posix.join(specsPath, relativeFilePath);

            const referencedContent = resolvedCache.get(fullPath);
            if (!referencedContent) {
                console.warn(`      Warning: Could not resolve reference to ${relativeFilePath}`);
                return obj;
            }

            if (jsonPointer) {
                const pathParts = jsonPointer.split('/').filter(p => p);
                let extractedContent = referencedContent;

                for (const part of pathParts) {
                    extractedContent = extractedContent?.[part];
                }

                if (extractedContent) {
                    return await replaceRefs(extractedContent);
                }
            }

            return obj;
        }

        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = await replaceRefs(value);
        }
        return result;
    }

    resolvedContent = await replaceRefs(resolvedContent);
    return resolvedContent;
}

async function fetchSpecFileContent(file, repo, specsPath, branch, resolvedCache) {
    const contentResponse = await axios.get(file.download_url);
    let content = yaml.load(contentResponse.data);
    content = await resolveExternalRefs(content, repo, specsPath, branch, resolvedCache);

    return {
        fileName: file.name,
        content,
    };
}

async function fetchSpecsFromRepo(repo, specsPath, branch = CONFIG.branch) {
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${specsPath}`;

    try {
        const response = await axios.get(apiUrl, {
            headers: getGithubHeaders(),
            params: {ref: branch},
        });

        const specFiles = response.data.filter(file => isSpecFile(file.name));

        if (specFiles.length === 0) {
            console.warn(`  ⚠ No spec files found in ${repo}/${specsPath}`);
            return [];
        }

        specFiles.forEach((file) => {
            console.log(`  - Found spec file: ${file.name}`);
        });

        const resolvedCache = new Map();

        return await Promise.all(
            specFiles.map(file => fetchSpecFileContent(file, repo, specsPath, branch, resolvedCache))
        );
    } catch (error) {
        console.error(`Error fetching specs from ${repo}:`, error.message);
        return [];
    }
}

function parseAudienceValue(audienceValue) {
    if (!audienceValue) {
        return [];
    }

    // Handle both string and array values for x-audience
    let audiences = Array.isArray(audienceValue) ? audienceValue : [audienceValue];

    // Handle comma-separated strings like "auth,cross-border"
    audiences = audiences.flatMap(aud =>
        typeof aud === 'string' && aud.includes(',')
            ? aud.split(',').map(s => s.trim())
            : aud
    );

    return audiences;
}

function shouldIncludeOperation(operation, audience) {
    if (!operation) {
        return false;
    }

    if (operation[VENDOR_EXTENSIONS.PUBLIC] !== true) {
        return false;
    }

    const audienceValue = operation[VENDOR_EXTENSIONS.AUDIENCE];
    const audiences = parseAudienceValue(audienceValue);

    return audiences.length > 0 && audiences.includes(audience);
}

function createBaseSpec(audience) {
    return {
        openapi: OPENAPI_VERSION,
        info: {
            title: `${audience.charAt(0).toUpperCase() + audience.slice(1)} API`,
            version: '1.0.0',
            description: `Public APIs for ${audience} integration`,
            contact: {
                name: 'Platform Support',
                email: 'platform-support@serhafen.com',
            },
        },
        paths: {},
        components: {
            schemas: {},
            securitySchemes: {},
        },
        tags: [],
        security: [],
    };
}

function ensureTag(tagSet, tags, category) {
    if (!category) {
        return;
    }
    if (!tagSet.has(category)) {
        tagSet.add(category);
        tags.push({
            name: category,
            description: `${category} operations`,
        });
    }
}

function cleanOperation(operation) {
    const cleaned = {...operation};
    delete cleaned[VENDOR_EXTENSIONS.PUBLIC];
    delete cleaned[VENDOR_EXTENSIONS.AUDIENCE];
    delete cleaned[VENDOR_EXTENSIONS.CATEGORY];
    delete cleaned.tags;
    delete cleaned.servers; // Remove any existing servers from the original operation
    return cleaned;
}

function addCategoryTag(operation, category) {
    if (category) {
        operation.tags = [category];
    } else {
        operation.tags = [];
    }
}

function addServersToOperation(cleanedOperation, originalOperation, specServers) {
    // Check if the operation has custom x-servers defined (highest priority)
    if (originalOperation[VENDOR_EXTENSIONS.SERVERS]) {
        cleanedOperation.servers = originalOperation[VENDOR_EXTENSIONS.SERVERS];
        return;
    }

    // Use servers from the original spec file (normal case)
    if (specServers && specServers.length > 0) {
        cleanedOperation.servers = specServers;
    } else {
        // Use default servers as fallback
        cleanedOperation.servers = CONFIG.defaultServers;
    }
}

function getTagOrderIndex(tagName) {
    const tagOrder = CONFIG.tagOrder || [];
    return tagOrder.indexOf(tagName);
}

function sortTags(tags) {
    return tags.sort((a, b) => {
        const indexA = getTagOrderIndex(a.name);
        const indexB = getTagOrderIndex(b.name);

        // Both tags are in the order list
        if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
        }

        if (indexA !== -1) {
            return -1;
        }

        // Only b is in the order list (b comes first)
        if (indexB !== -1) {
            return 1;
        }

        // Neither is in the order list, sort alphabetically
        return a.name.localeCompare(b.name);
    });
}

function sortPaths(paths) {
    const sortedPaths = {};
    const pathEntries = Object.entries(paths);

    // Group paths by their primary tag
    const pathsByTag = {};
    pathEntries.forEach(([path, methods]) => {
        // Get the primary tag from the first method found
        const firstMethod = HTTP_METHODS.find(m => methods[m]);
        const primaryTag = firstMethod && methods[firstMethod]?.tags?.[0];

        if (!pathsByTag[primaryTag || 'untagged']) {
            pathsByTag[primaryTag || 'untagged'] = [];
        }

        pathsByTag[primaryTag || 'untagged'].push([path, methods]);
    });

    // Sort paths within each tag group and combine
    const sortedTagNames = Object.keys(pathsByTag).sort((a, b) => {
        const indexA = getTagOrderIndex(a);
        const indexB = getTagOrderIndex(b);

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    sortedTagNames.forEach(tagName => {
        const tagPaths = pathsByTag[tagName];
        // Sort paths alphabetically within each tag group
        tagPaths.sort((a, b) => a[0].localeCompare(b[0]));

        tagPaths.forEach(([path, methods]) => {
            sortedPaths[path] = methods;
        });
    });

    return sortedPaths;
}

function processOperation(operation, audience, serviceName, pathKey, method, aggregated, tagSet, specServers) {
    if (!shouldIncludeOperation(operation, audience)) {
        return;
    }

    const prefixedPath = shouldPrefixPaths() ? `/${serviceName}${pathKey}` : pathKey;

    if (!aggregated.paths[prefixedPath]) {
        aggregated.paths[prefixedPath] = {};
    }

    const category = operation[VENDOR_EXTENSIONS.CATEGORY];

    // Warn if a public endpoint doesn't have a category
    if (!category) {
        console.log(`    ⚠ Warning: ${method.toUpperCase()} ${pathKey} is public but has no x-category defined`);
    }

    ensureTag(tagSet, aggregated.tags, category);

    let cleanedOperation = cleanOperation(operation);

    if (shouldPrefixSchemas()) {
        cleanedOperation = updateSchemaReferences(cleanedOperation, serviceName);
    }

    addCategoryTag(cleanedOperation, category);

    // Add servers to the operation from the original spec file
    addServersToOperation(cleanedOperation, operation, specServers);

    aggregated.paths[prefixedPath][method] = cleanedOperation;
}

function processPaths(content, audience, serviceName, aggregated, tagSet, specServers) {
    if (!content.paths) {
        console.log(`    ⚠ No paths found in spec`);
        return;
    }

    let processedCount = 0;
    let skippedCount = 0;
    const pathCount = Object.keys(content.paths).length;

    Object.entries(content.paths).forEach(([pathKey, pathItem]) => {
        HTTP_METHODS.forEach((method) => {
            const operation = pathItem[method];
            if (operation) {
                if (shouldIncludeOperation(operation, audience)) {
                    processOperation(operation, audience, serviceName, pathKey, method, aggregated, tagSet, specServers);
                    processedCount++;
                } else {
                    skippedCount++;
                    const isPublic = operation[VENDOR_EXTENSIONS.PUBLIC] === true;
                    const audienceValue = operation[VENDOR_EXTENSIONS.AUDIENCE];
                    const audiences = parseAudienceValue(audienceValue);
                    const hasAudience = audiences.length > 0 && audiences.includes(audience);

                    if (!isPublic) {
                        console.log(`    ⊘ Skipped ${method.toUpperCase()} ${pathKey}: not marked as public (x-public: true)`);
                    } else if (!hasAudience) {
                        console.log(`    ⊘ Skipped ${method.toUpperCase()} ${pathKey}: audience '${audience}' not in x-audience: [${audiences.join(', ')}]`);
                    }
                }
            }
        });
    });

    console.log(`    📊 Processed ${processedCount} operation(s), skipped ${skippedCount} from ${pathCount} path(s)`);
}

function updateSchemaReferences(obj, serviceName) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => updateSchemaReferences(item, serviceName));
    }

    if (obj.$ref && typeof obj.$ref === 'string' && obj.$ref.includes('#/components/schemas/')) {
        return {
            ...obj,
            $ref: obj.$ref.replace(
                /#\/components\/schemas\/([A-Za-z0-9_]+)/g,
                (match, schemaName) => `#/components/schemas/${serviceName}_${schemaName}`
            )
        };
    }

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        result[key] = updateSchemaReferences(value, serviceName);
    }
    return result;
}

function collectReferencedSchemas(obj, schemaSet = new Set()) {
    if (!obj || typeof obj !== 'object') {
        return schemaSet;
    }

    if (Array.isArray(obj)) {
        obj.forEach(item => collectReferencedSchemas(item, schemaSet));
        return schemaSet;
    }

    if (obj.$ref && typeof obj.$ref === 'string') {
        const match = obj.$ref.match(/#\/components\/schemas\/([A-Za-z0-9_]+)/);
        if (match) {
            schemaSet.add(match[1]);
        }
    }

    for (const value of Object.values(obj)) {
        collectReferencedSchemas(value, schemaSet);
    }

    return schemaSet;
}

function mergeSchemas(content, serviceName, aggregated) {
    if (!content.components?.schemas) {
        return;
    }

    const usePrefixing = shouldPrefixSchemas();

    const updatedSchemas = {};
    Object.entries(content.components.schemas).forEach(([schemaName, schema]) => {
        updatedSchemas[schemaName] = usePrefixing
            ? updateSchemaReferences(schema, serviceName)
            : schema;
    });

    if (usePrefixing) {
        Object.entries(updatedSchemas).forEach(([schemaName, schema]) => {
            const prefixedSchemaName = `${serviceName}_${schemaName}`;
            aggregated.components.schemas[prefixedSchemaName] = schema;
        });
    } else {
        Object.assign(aggregated.components.schemas, updatedSchemas);
    }
}

function mergeSecurity(content, aggregated) {
    if (content.components?.securitySchemes) {
        Object.assign(
            aggregated.components.securitySchemes,
            content.components.securitySchemes
        );
    }

    if (content.security) {
        aggregated.security.push(...content.security);
    }
}

function removeUnusedSchemas(aggregated) {
    const referencedSchemas = new Set();

    collectReferencedSchemas(aggregated.paths, referencedSchemas);

    if (aggregated.components?.securitySchemes) {
        collectReferencedSchemas(aggregated.components.securitySchemes, referencedSchemas);
    }

    const allSchemas = aggregated.components.schemas;
    const requiredSchemas = new Set();
    const toProcess = new Set(referencedSchemas);
    const processed = new Set();

    while (toProcess.size > 0) {
        const schemaName = [...toProcess][0];
        toProcess.delete(schemaName);

        if (processed.has(schemaName)) {
            continue;
        }
        processed.add(schemaName);
        requiredSchemas.add(schemaName);

        const schema = allSchemas[schemaName];
        if (schema) {
            const referencedInSchema = collectReferencedSchemas(schema);
            referencedInSchema.forEach(ref => {
                if (!processed.has(ref)) {
                    toProcess.add(ref);
                }
            });
        }
    }

    const filteredSchemas = {};
    for (const schemaName of requiredSchemas) {
        if (allSchemas[schemaName]) {
            filteredSchemas[schemaName] = allSchemas[schemaName];
        }
    }

    aggregated.components.schemas = filteredSchemas;
}

function processSpec(content, serviceName, audience, aggregated, tagSet) {
    // Extract servers from the original spec to use for all operations from this spec
    const specServers = content.servers || [];

    processPaths(content, audience, serviceName, aggregated, tagSet, specServers);
    mergeSchemas(content, serviceName, aggregated);
    mergeSecurity(content, aggregated);
}

function aggregateSpecsForAudience(allSpecs, audience) {
    const aggregated = createBaseSpec(audience);
    const tagSet = new Set();

    allSpecs.forEach(({serviceName, specs}) => {
        specs.forEach(({content}) => {
            processSpec(content, serviceName, audience, aggregated, tagSet);
        });
    });

    removeUnusedSchemas(aggregated);

    // Sort tags according to defined order
    aggregated.tags = sortTags(aggregated.tags);

    // Sort paths by tag grouping
    aggregated.paths = sortPaths(aggregated.paths);

    return aggregated;
}

async function fetchAllServiceSpecs() {
    return Promise.all(
        CONFIG.services.map(async (service) => {
            console.log(`Fetching specs from ${service.name} (branch: ${CONFIG.branch})...`);
            const specs = await fetchSpecsFromRepo(service.repo, service.specsPath, CONFIG.branch);
            return {
                serviceName: service.name,
                specs,
            };
        })
    );
}

async function writeAggregatedSpec(audience, aggregatedSpec) {
    const outputPath = path.join(CONFIG.outputDir, `${audience}-api.openapi.yaml`);
    await fs.writeFile(outputPath, yaml.dump(aggregatedSpec, {lineWidth: -1}));

    // Count unique servers across all operations
    const uniqueServers = new Set();
    for (const pathItem of Object.values(aggregatedSpec.paths)) {
        for (const operation of Object.values(pathItem)) {
            if (operation.servers) {
                operation.servers.forEach(server => {
                    uniqueServers.add(`${server.description}: ${server.url}`);
                });
            }
        }
    }

    console.log(`✓ Generated ${outputPath}`);
    console.log(`  - Paths: ${Object.keys(aggregatedSpec.paths).length}`);
    console.log(`  - Schemas: ${Object.keys(aggregatedSpec.components.schemas).length}`);
    console.log(`  - Tags: ${aggregatedSpec.tags.length}`);
    console.log(`  - Unique servers across operations: ${uniqueServers.size}`);
    [...uniqueServers].sort().forEach(serverInfo => {
        console.log(`    • ${serverInfo}`);
    });
}

async function generateAudienceSpecs(allSpecs) {
    for (const audience of CONFIG.audiences) {
        console.log(`\nGenerating ${audience} spec...`);
        const aggregatedSpec = aggregateSpecsForAudience(allSpecs, audience);
        await writeAggregatedSpec(audience, aggregatedSpec);
    }
}

async function aggregateSpecs() {
    console.log('Starting spec aggregation...\n');

    validateConfig();

    console.log('Configuration:');
    console.log(`  Services: ${CONFIG.services.length}`);
    console.log(`  Audiences: ${CONFIG.audiences.join(', ')}`);
    console.log(`  Branch: ${CONFIG.branch}`);
    console.log(`  Schema prefixing: ${shouldPrefixSchemas() ? 'enabled' : 'disabled'} (${CONFIG.prefixSchemas || 'auto'})`);
    console.log(`  Path prefixing: ${shouldPrefixPaths() ? 'enabled' : 'disabled'} (${CONFIG.prefixPaths || 'auto'})`);
    console.log('');

    const allSpecs = await fetchAllServiceSpecs();

    await fs.mkdir(CONFIG.outputDir, {recursive: true});

    await generateAudienceSpecs(allSpecs);

    console.log('\n✓ Aggregation complete!');
}

if (require.main === module) {
    aggregateSpecs().catch((error) => {
        console.error('Aggregation failed:', error);
        process.exit(1);
    });
}

module.exports = {aggregateSpecs};

