import cors from '@fastify/cors';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { createMcpFastifyApp, type CreateMcpFastifyAppOptions } from '@modelcontextprotocol/fastify';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { createGithubMcpServer } from './github-mcp/mcp.js';
import { githubOAuthConfig } from './github-mcp/common/github-oauth.js';
import { logger } from './common/logger.js';

const app = createMcpFastifyApp({ host: '0.0.0.0', allowedHosts: ['myapp.local', 'localhost'] } as CreateMcpFastifyAppOptions);
const mcpCorsMethods = ['GET', 'POST', 'DELETE', 'OPTIONS'];
const mcpCorsHeaders = ['Accept', 'Content-Type', 'Mcp-Protocol-Version', 'Mcp-Session-Id'];

await app.register(cors, {
    origin: githubOAuthConfig.homepageUrl,
    methods: mcpCorsMethods,
    allowedHeaders: mcpCorsHeaders,
    exposedHeaders: ['Mcp-Session-Id']
});
type McpDefinition = {
    name: string;
    createServer: () => ReturnType<typeof createGithubMcpServer>;
};

const mcpDefinitions: McpDefinition[] = [
    { name: 'github-mcp', createServer: createGithubMcpServer }
];

const handleMcpRequest = async (request: FastifyRequest, reply: FastifyReply) => {
        const { mcpName } = request.params as { mcpName: string };
        logger.info('MCP request started', { method: request.method, mcpName });
        const definition = mcpDefinitions.find((candidate) => candidate.name === mcpName);
        if (!definition) {
            logger.warn('MCP request rejected: server not found', { mcpName });
            return reply.code(404).send({ error: `MCP server '${mcpName}' was not found.` });
        }

        const origin = request.headers.origin;
        if (origin === githubOAuthConfig.homepageUrl) {
            reply.raw.setHeader('Access-Control-Allow-Origin', origin);
            reply.raw.setHeader('Access-Control-Allow-Methods', mcpCorsMethods.join(', '));
            reply.raw.setHeader('Access-Control-Allow-Headers', mcpCorsHeaders.join(', '));
            reply.raw.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
            reply.raw.setHeader('Vary', 'Origin');
        }

        // Each stateless HTTP request gets its own server so concurrent clients cannot share transport state.
        const server = await definition.createServer();
        const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        await server.connect(transport);

        reply.raw.on('close', () => {
            void transport.close();
        });

        await transport.handleRequest(request.raw, reply.raw, request.body);
        logger.info('MCP request completed', { method: request.method, mcpName });
};

app.get('/:mcpName', handleMcpRequest);
app.post('/:mcpName', handleMcpRequest);
app.delete('/:mcpName', handleMcpRequest);

app.listen({ host: '0.0.0.0', port: 3000 }, () => {
    logger.info('MCP server started', { port: 3000 });
    console.log('Server is running on http://localhost:3000');
    for (const definition of mcpDefinitions) {
        console.log(`${definition.name} is available at http://localhost:3000/${definition.name}`);
    }
});