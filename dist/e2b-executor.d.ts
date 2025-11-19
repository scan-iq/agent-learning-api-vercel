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
import type { IrisCodeResult } from './types';
export interface E2BExecutorConfig {
    apiKey?: string;
    template?: string;
    timeout?: number;
}
export declare class IrisCodeExecutor {
    private apiKey;
    private template;
    private timeout;
    private activeSandboxes;
    constructor(config?: E2BExecutorConfig);
    /**
     * Execute TypeScript code in E2B sandbox with IRIS Prime access
     */
    executeCode(code: string, options?: {
        projectId?: string;
        sessionId?: string;
        context?: Record<string, any>;
        sandboxId?: string;
    }): Promise<IrisCodeResult>;
    /**
     * Create and initialize E2B sandbox
     */
    private createSandbox;
    /**
     * Setup IRIS Prime environment in sandbox
     */
    private setupIrisEnvironment;
    /**
     * Format execution output for consumption
     */
    private formatOutput;
    /**
     * Format logs from Execution to string array
     */
    private formatLogs;
    /**
     * Cleanup sandbox resources
     */
    private cleanupSandbox;
    /**
     * Get sandbox for reuse
     */
    getSandbox(sandboxId: string): Promise<Sandbox | null>;
    /**
     * Close specific sandbox
     */
    closeSandbox(sandboxId: string): Promise<void>;
    /**
     * Close all active sandboxes
     */
    closeAll(): Promise<void>;
    /**
     * Get active sandbox count
     */
    getActiveSandboxCount(): number;
}
export declare function getExecutor(config?: E2BExecutorConfig): IrisCodeExecutor;
export declare function resetExecutor(): void;
//# sourceMappingURL=e2b-executor.d.ts.map