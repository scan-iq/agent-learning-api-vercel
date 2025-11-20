/**
 * E2B Sandbox Setup Script for IRIS
 *
 * This module handles initialization and configuration of E2B sandboxes
 * with IRIS MCP server integration.
 */

import { Sandbox } from '@e2b/code-interpreter';

export interface SandboxSetupOptions {
  apiKey: string;
  template?: string;
  projectId?: string;
  installPackages?: string[];
  envVars?: Record<string, string>;
}

export interface SandboxSetupResult {
  sandbox: Sandbox;
  sandboxId: string;
  ready: boolean;
  installedPackages: string[];
  setupTime: number;
}

/**
 * Setup E2B sandbox with IRIS environment
 */
export async function setupIrisSandbox(
  options: SandboxSetupOptions
): Promise<SandboxSetupResult> {
  const startTime = Date.now();
  const installedPackages: string[] = [];

  // Create sandbox
  const sandbox = await Sandbox.create(options.template || 'nodejs', {
    apiKey: options.apiKey,
    metadata: {
      projectId: options.projectId || 'unknown',
      purpose: 'iris-prime-execution',
      createdAt: new Date().toISOString(),
    },
  });

  try {
    // Install core dependencies
    const corePackages = [
      '@modelcontextprotocol/sdk',
      '@foxruv/agent-learning-core',
    ];

    const packagesToInstall = [
      ...corePackages,
      ...(options.installPackages || []),
    ];

    console.log('Installing packages:', packagesToInstall.join(', '));

    await sandbox.runCode(`
      const { execSync } = require('child_process');
      const packages = ${JSON.stringify(packagesToInstall)};

      console.log('Installing npm packages...');
      execSync(\`npm install --no-save \${packages.join(' ')}\`, {
        stdio: 'inherit',
      });

      console.log('Installation complete');
      return packages;
    `, { language: 'javascript' });

    installedPackages.push(...packagesToInstall);

    // Set environment variables
    if (options.envVars) {
      const envCode = Object.entries(options.envVars)
        .map(([key, value]) => `process.env.${key} = ${JSON.stringify(value)};`)
        .join('\n');

      await sandbox.runCode(envCode, { language: 'javascript' });
    }

    // Create IRIS wrapper module
    await createIrisWrapper(sandbox, options.projectId);

    // Verify MCP connection
    await verifyMcpConnection(sandbox);

    const setupTime = Date.now() - startTime;

    return {
      sandbox,
      sandboxId: sandbox.sandboxId,
      ready: true,
      installedPackages,
      setupTime,
    };

  } catch (error) {
    // Cleanup on failure
    await sandbox.kill();
    throw error;
  }
}

/**
 * Create IRIS wrapper module in sandbox
 */
async function createIrisWrapper(
  sandbox: Sandbox,
  projectId?: string
): Promise<void> {
  const wrapperCode = `
/**
 * IRIS MCP Client Wrapper
 * Auto-generated for sandbox execution
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class IrisClient {
  constructor() {
    this.client = null;
    this.connected = false;
    this.projectId = ${JSON.stringify(projectId || null)};
  }

  async connect() {
    if (this.connected) return;

    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['@foxruv/agent-learning-core', 'mcp', 'start'],
    });

    this.client = new Client({
      name: 'iris-prime-sandbox',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    await this.client.connect(transport);
    this.connected = true;

    console.log('[IRIS] Connected to MCP server');
  }

  async callTool(name, args) {
    await this.connect();
    const result = await this.client.callTool(name, args);
    return result;
  }

  async close() {
    if (this.client && this.connected) {
      await this.client.close();
      this.connected = false;
      console.log('[IRIS] Disconnected from MCP server');
    }
  }
}

// Singleton instance
const irisClient = new IrisClient();

// Public API
export const iris = {
  // Pattern Discovery
  async discoverPatterns(config = {}) {
    return await irisClient.callTool('pattern_discovery', config);
  },

  // Reflexion
  async evaluateOutput(input, output, verdict, reasoning) {
    return await irisClient.callTool('reflexion_evaluate', {
      input,
      output,
      verdict,
      reasoning,
    });
  },

  // Consensus
  async submitVote(consensusId, agentId, vote, reasoning) {
    return await irisClient.callTool('consensus_vote', {
      consensusId,
      agentId,
      vote,
      reasoning,
    });
  },

  async getConsensusStatus(consensusId) {
    return await irisClient.callTool('consensus_status', { consensusId });
  },

  // Telemetry
  async logEvent(event, metadata = {}) {
    return await irisClient.callTool('telemetry_log', {
      event,
      metadata,
      timestamp: new Date().toISOString(),
    });
  },

  // Prompt Registry
  async getPrompt(name) {
    return await irisClient.callTool('prompt_get', { name });
  },

  async savePrompt(name, template, variables, metadata) {
    return await irisClient.callTool('prompt_save', {
      name,
      template,
      variables,
      metadata,
    });
  },

  async listPrompts(filter) {
    return await irisClient.callTool('prompt_list', { filter });
  },

  // Lineage Tracking
  async trackLineage(signature, input, output, parentId) {
    return await irisClient.callTool('lineage_track', {
      signature,
      input,
      output,
      parentId,
      timestamp: new Date().toISOString(),
    });
  },

  async getLineage(signatureId) {
    return await irisClient.callTool('lineage_get', { signatureId });
  },

  // Global Metrics
  async recordMetric(metric, value, tags = {}) {
    return await irisClient.callTool('metric_record', {
      metric,
      value,
      tags,
      timestamp: new Date().toISOString(),
    });
  },

  async getMetrics(filter) {
    return await irisClient.callTool('metrics_get', { filter });
  },

  // Agent Management
  async registerAgent(agentId, capabilities, metadata) {
    return await irisClient.callTool('agent_register', {
      agentId,
      capabilities,
      metadata,
    });
  },

  async getAgentStatus(agentId) {
    return await irisClient.callTool('agent_status', { agentId });
  },

  // Cleanup
  async close() {
    await irisClient.close();
  },
};

// Context exports
export const projectId = irisClient.projectId;
export const sessionId = process.env.SESSION_ID || null;
export const context = {
  environment: process.env.NODE_ENV || 'sandbox',
  sandboxId: process.env.SANDBOX_ID || null,
};

// Auto-connect on first import
await irisClient.connect();
`;

  await sandbox.files.write('/app/iris-prime.ts', wrapperCode);
  console.log('[Setup] IRIS wrapper module created');
}

/**
 * Verify MCP connection is working
 */
async function verifyMcpConnection(sandbox: Sandbox): Promise<void> {
  const testCode = `
    import { iris } from './iris-prime';

    try {
      // Test connection by logging a test event
      await iris.logEvent('sandbox_initialized', {
        test: true,
        timestamp: new Date().toISOString(),
      });
      console.log('[Verify] MCP connection successful');
      return true;
    } catch (error) {
      console.error('[Verify] MCP connection failed:', error.message);
      throw error;
    }
  `;

  const result = await sandbox.runCode(testCode, {
    language: 'javascript',
    timeoutMs: 10000,
  });

  if (result.error) {
    throw new Error(`MCP verification failed: ${result.error.value}`);
  }

  console.log('[Setup] MCP connection verified');
}

/**
 * Install additional packages in existing sandbox
 */
export async function installPackages(
  sandbox: Sandbox,
  packages: string[]
): Promise<void> {
  if (packages.length === 0) return;

  console.log('Installing additional packages:', packages.join(', '));

  const installCode = `
    const { execSync } = require('child_process');
    const packages = ${JSON.stringify(packages)};

    execSync(\`npm install --no-save \${packages.join(' ')}\`, {
      stdio: 'inherit',
    });

    console.log('Additional packages installed');
  `;

  await sandbox.runCode(installCode, { language: 'javascript' });
}

/**
 * Configure sandbox environment
 */
export async function configureSandboxEnv(
  sandbox: Sandbox,
  envVars: Record<string, string>
): Promise<void> {
  const envCode = Object.entries(envVars)
    .map(([key, value]) => `process.env.${key} = ${JSON.stringify(value)};`)
    .join('\n');

  await sandbox.runCode(envCode, { language: 'javascript' });
  console.log('[Setup] Environment variables configured');
}

/**
 * Health check for sandbox
 */
export async function healthCheck(sandbox: Sandbox): Promise<{
  healthy: boolean;
  mcpConnected: boolean;
  packages: string[];
  uptime: number;
}> {
  const checkCode = `
    import { iris } from './iris-prime';

    const startTime = process.uptime() * 1000;

    try {
      // Test MCP connection
      await iris.logEvent('health_check', { timestamp: Date.now() });

      // Get installed packages
      const { execSync } = require('child_process');
      const packagesOutput = execSync('npm list --depth=0 --json', {
        encoding: 'utf-8',
      });
      const packageData = JSON.parse(packagesOutput);
      const packages = Object.keys(packageData.dependencies || {});

      return {
        healthy: true,
        mcpConnected: true,
        packages,
        uptime: startTime,
      };
    } catch (error) {
      return {
        healthy: false,
        mcpConnected: false,
        packages: [],
        uptime: startTime,
        error: error.message,
      };
    }
  `;

  const result = await sandbox.runCode(checkCode, {
    language: 'javascript',
    timeoutMs: 5000,
  });

  if (result.error) {
    return {
      healthy: false,
      mcpConnected: false,
      packages: [],
      uptime: 0,
    };
  }

  return JSON.parse(result.results[0]?.text || '{}');
}
