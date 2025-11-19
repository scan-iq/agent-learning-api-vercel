/**
 * E2B Code Executor for IRIS Prime
 *
 * Executes TypeScript code in isolated E2B sandboxes with IRIS Prime MCP server access.
 * Follows Anthropic's pattern of sandbox execution with MCP integration.
 *
 * Architecture:
 * - Creates E2B sandbox with Node.js runtime
 * - Mounts IRIS Prime MCP server wrappers
 * - Executes user code with access to IRIS tools
 * - Returns formatted results with telemetry
 */
import { Sandbox } from '@e2b/code-interpreter';
export class IrisCodeExecutor {
    apiKey;
    template;
    timeout;
    activeSandboxes;
    constructor(config = {}) {
        this.apiKey = config.apiKey || process.env.E2B_API_KEY?.trim() || '';
        this.template = config.template || 'nodejs';
        this.timeout = config.timeout || 300000; // 5 minutes
        this.activeSandboxes = new Map();
        if (!this.apiKey) {
            throw new Error('E2B_API_KEY environment variable is required');
        }
    }
    /**
     * Execute TypeScript code in E2B sandbox with IRIS Prime access
     */
    async executeCode(code, options = {}) {
        const startTime = Date.now();
        let sandbox = null;
        try {
            // Reuse sandbox if provided, otherwise create new one
            if (options.sandboxId && this.activeSandboxes.has(options.sandboxId)) {
                sandbox = this.activeSandboxes.get(options.sandboxId);
            }
            else {
                sandbox = await this.createSandbox(options.projectId);
                if (options.sandboxId) {
                    this.activeSandboxes.set(options.sandboxId, sandbox);
                }
            }
            // Setup IRIS Prime environment
            await this.setupIrisEnvironment(sandbox, options);
            // Execute the code
            const execution = await sandbox.runCode(code, {
                language: 'javascript',
                timeoutMs: this.timeout,
            });
            const executionTime = Date.now() - startTime;
            // Format results
            return {
                success: !execution.error,
                output: this.formatOutput(execution),
                error: execution.error ? {
                    message: execution.error.value || 'Execution failed',
                    stack: execution.error.traceback,
                    name: execution.error.name || 'ExecutionError',
                } : undefined,
                executionTime,
                logs: this.formatLogs(execution.logs),
                metadata: {
                    sandboxId: sandbox.sandboxId,
                    projectId: options.projectId,
                    sessionId: options.sessionId,
                    timestamp: new Date().toISOString(),
                },
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            return {
                success: false,
                output: '',
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined,
                    name: error instanceof Error ? error.name : 'Error',
                },
                executionTime,
                logs: [],
                metadata: {
                    sandboxId: sandbox?.sandboxId,
                    projectId: options.projectId,
                    sessionId: options.sessionId,
                    timestamp: new Date().toISOString(),
                },
            };
        }
        finally {
            // Cleanup sandbox if not being reused
            if (sandbox && !options.sandboxId) {
                await this.cleanupSandbox(sandbox);
            }
        }
    }
    /**
     * Create and initialize E2B sandbox
     */
    async createSandbox(projectId) {
        const sandbox = await Sandbox.create(this.template, {
            apiKey: this.apiKey,
            metadata: {
                projectId: projectId || 'unknown',
                createdAt: new Date().toISOString(),
            },
        });
        // Install required dependencies
        await sandbox.runCode(`
      const { execSync } = require('child_process');

      // Install IRIS Prime MCP client and dependencies
      execSync('npm install --no-save @modelcontextprotocol/sdk @foxruv/agent-learning-core', {
        stdio: 'inherit',
      });
    `, { language: 'javascript' });
        return sandbox;
    }
    /**
     * Setup IRIS Prime environment in sandbox
     */
    async setupIrisEnvironment(sandbox, options) {
        // Create IRIS wrapper module that code can import
        const wrapperCode = `
// IRIS Prime MCP Wrapper
// This module provides access to IRIS Prime tools via MCP

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

let mcpClient = null;

// Initialize MCP connection to IRIS Prime server
async function initIris() {
  if (mcpClient) return mcpClient;

  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['@foxruv/agent-learning-core', 'mcp', 'start'],
  });

  mcpClient = new Client({
    name: 'iris-prime-sandbox',
    version: '1.0.0',
  }, {
    capabilities: {},
  });

  await mcpClient.connect(transport);
  return mcpClient;
}

// IRIS Prime tool wrappers
export const iris = {
  // Pattern Discovery
  async discoverPatterns(config) {
    const client = await initIris();
    return await client.callTool('pattern_discovery', config);
  },

  // Reflexion & Self-Improvement
  async evaluateOutput(input, output, verdict) {
    const client = await initIris();
    return await client.callTool('reflexion_evaluate', { input, output, verdict });
  },

  // Consensus & Multi-Agent
  async submitVote(consensusId, agentId, vote) {
    const client = await initIris();
    return await client.callTool('consensus_vote', { consensusId, agentId, vote });
  },

  // Telemetry
  async logEvent(event, metadata) {
    const client = await initIris();
    return await client.callTool('telemetry_log', { event, metadata });
  },

  // Prompt Registry
  async getPrompt(name) {
    const client = await initIris();
    return await client.callTool('prompt_get', { name });
  },

  async savePrompt(name, template, variables) {
    const client = await initIris();
    return await client.callTool('prompt_save', { name, template, variables });
  },

  // Lineage Tracking
  async trackLineage(signature, input, output) {
    const client = await initIris();
    return await client.callTool('lineage_track', { signature, input, output });
  },

  // Global Metrics
  async recordMetric(metric, value, tags) {
    const client = await initIris();
    return await client.callTool('metric_record', { metric, value, tags });
  },

  // Cleanup
  async close() {
    if (mcpClient) {
      await mcpClient.close();
      mcpClient = null;
    }
  }
};

// Context from execution
export const context = ${JSON.stringify(options.context || {})};
export const projectId = ${JSON.stringify(options.projectId || null)};
export const sessionId = ${JSON.stringify(options.sessionId || null)};
`;
        await sandbox.files.write('/app/iris-prime.ts', wrapperCode);
    }
    /**
     * Format execution output for consumption
     */
    formatOutput(execution) {
        const parts = [];
        // Add results
        if (execution.results && execution.results.length > 0) {
            parts.push('=== Results ===');
            execution.results.forEach((result, index) => {
                if (result.text) {
                    parts.push(`[${index}] ${result.text}`);
                }
                if (result.html) {
                    parts.push(`[${index}] <HTML output>`);
                }
                if (result.png) {
                    parts.push(`[${index}] <PNG image>`);
                }
            });
        }
        // Add stdout
        if (execution.logs?.stdout && execution.logs.stdout.length > 0) {
            parts.push('\n=== Output ===');
            execution.logs.stdout.forEach((msg) => {
                parts.push(msg.line || msg.toString());
            });
        }
        // Add stderr
        if (execution.logs?.stderr && execution.logs.stderr.length > 0) {
            parts.push('\n=== Errors ===');
            execution.logs.stderr.forEach((msg) => {
                parts.push(msg.line || msg.toString());
            });
        }
        return parts.join('\n') || '(no output)';
    }
    /**
     * Format logs from Execution to string array
     */
    formatLogs(logs) {
        const formatted = [];
        if (logs?.stdout) {
            logs.stdout.forEach((msg) => {
                formatted.push(`[stdout] ${msg.line || msg.toString()}`);
            });
        }
        if (logs?.stderr) {
            logs.stderr.forEach((msg) => {
                formatted.push(`[stderr] ${msg.line || msg.toString()}`);
            });
        }
        return formatted;
    }
    /**
     * Cleanup sandbox resources
     */
    async cleanupSandbox(sandbox) {
        try {
            await sandbox.kill();
        }
        catch (error) {
            console.error('Error cleaning up sandbox:', error);
        }
    }
    /**
     * Get sandbox for reuse
     */
    async getSandbox(sandboxId) {
        return this.activeSandboxes.get(sandboxId) || null;
    }
    /**
     * Close specific sandbox
     */
    async closeSandbox(sandboxId) {
        const sandbox = this.activeSandboxes.get(sandboxId);
        if (sandbox) {
            await this.cleanupSandbox(sandbox);
            this.activeSandboxes.delete(sandboxId);
        }
    }
    /**
     * Close all active sandboxes
     */
    async closeAll() {
        const cleanupPromises = Array.from(this.activeSandboxes.values()).map(sandbox => this.cleanupSandbox(sandbox));
        await Promise.allSettled(cleanupPromises);
        this.activeSandboxes.clear();
    }
    /**
     * Get active sandbox count
     */
    getActiveSandboxCount() {
        return this.activeSandboxes.size;
    }
}
/**
 * Singleton executor instance
 */
let executorInstance = null;
export function getExecutor(config) {
    if (!executorInstance) {
        executorInstance = new IrisCodeExecutor(config);
    }
    return executorInstance;
}
export function resetExecutor() {
    if (executorInstance) {
        executorInstance.closeAll();
        executorInstance = null;
    }
}
