/**
 * Data transformation utilities to convert agent-learning-core
 * data structures to dashboard-compatible formats
 */
export interface DashboardMetrics {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    confidence: number;
    timestamp: string;
}
export interface DashboardAnomaly {
    id: string;
    timestamp: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    metadata?: Record<string, any>;
}
export interface DashboardPattern {
    id: string;
    name: string;
    category: string;
    frequency: number;
    lastSeen: string;
    confidence: number;
    metadata?: Record<string, any>;
}
export interface DashboardEvaluation {
    projectId: string;
    timestamp: string;
    metrics: DashboardMetrics;
    anomalies: DashboardAnomaly[];
    patterns: DashboardPattern[];
    recommendations: string[];
    status: 'healthy' | 'warning' | 'critical';
}
/**
 * Transform IRIS Prime evaluation result to dashboard format
 */
export declare function transformEvaluation(evaluation: any, projectId: string): DashboardEvaluation;
/**
 * Transform metrics to dashboard format
 */
export declare function transformMetrics(metrics: any): DashboardMetrics;
/**
 * Transform anomalies to dashboard format
 */
export declare function transformAnomalies(anomalies: any[]): DashboardAnomaly[];
/**
 * Transform patterns to dashboard format
 */
export declare function transformPatterns(patterns: any[]): DashboardPattern[];
/**
 * Transform time-series data for charts
 */
export interface TimeSeriesPoint {
    timestamp: string;
    value: number;
}
export declare function transformTimeSeries(data: any[]): TimeSeriesPoint[];
//# sourceMappingURL=transform.d.ts.map