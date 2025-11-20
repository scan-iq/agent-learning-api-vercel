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
export declare function setupIrisSandbox(options: SandboxSetupOptions): Promise<SandboxSetupResult>;
/**
 * Install additional packages in existing sandbox
 */
export declare function installPackages(sandbox: Sandbox, packages: string[]): Promise<void>;
/**
 * Configure sandbox environment
 */
export declare function configureSandboxEnv(sandbox: Sandbox, envVars: Record<string, string>): Promise<void>;
/**
 * Health check for sandbox
 */
export declare function healthCheck(sandbox: Sandbox): Promise<{
    healthy: boolean;
    mcpConnected: boolean;
    packages: string[];
    uptime: number;
}>;
//# sourceMappingURL=setup-e2b-sandbox.d.ts.map