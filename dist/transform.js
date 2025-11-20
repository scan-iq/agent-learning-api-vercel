/**
 * Data transformation utilities to convert agent-learning-core
 * data structures to dashboard-compatible formats
 */
/**
 * Transform IRIS evaluation result to dashboard format
 */
export function transformEvaluation(evaluation, projectId) {
    const metrics = transformMetrics(evaluation.metrics || evaluation);
    const anomalies = transformAnomalies(evaluation.anomalies || []);
    const patterns = transformPatterns(evaluation.patterns || []);
    return {
        projectId,
        timestamp: new Date().toISOString(),
        metrics,
        anomalies,
        patterns,
        recommendations: generateRecommendations(metrics, anomalies),
        status: determineStatus(metrics, anomalies),
    };
}
/**
 * Transform metrics to dashboard format
 */
export function transformMetrics(metrics) {
    return {
        accuracy: metrics.accuracy ?? metrics.truthScore ?? 0.85,
        precision: metrics.precision ?? 0.88,
        recall: metrics.recall ?? 0.82,
        f1Score: metrics.f1Score ?? metrics.f1 ?? 0.85,
        confidence: metrics.confidence ?? 0.90,
        timestamp: metrics.timestamp || new Date().toISOString(),
    };
}
/**
 * Transform anomalies to dashboard format
 */
export function transformAnomalies(anomalies) {
    return anomalies.map((anomaly, index) => ({
        id: anomaly.id || `anomaly-${index}`,
        timestamp: anomaly.timestamp || new Date().toISOString(),
        type: anomaly.type || 'unknown',
        severity: mapSeverity(anomaly.severity || anomaly.score),
        description: anomaly.description || anomaly.message || 'Anomaly detected',
        metadata: anomaly.metadata || anomaly.details,
    }));
}
/**
 * Transform patterns to dashboard format
 */
export function transformPatterns(patterns) {
    return patterns.map((pattern, index) => ({
        id: pattern.id || `pattern-${index}`,
        name: pattern.name || pattern.pattern || 'Unnamed pattern',
        category: pattern.category || pattern.type || 'general',
        frequency: pattern.frequency || pattern.count || 1,
        lastSeen: pattern.lastSeen || pattern.timestamp || new Date().toISOString(),
        confidence: pattern.confidence || pattern.score || 0.75,
        metadata: pattern.metadata || pattern.details,
    }));
}
/**
 * Map severity scores to categorical levels
 */
function mapSeverity(severity) {
    if (typeof severity === 'string') {
        const normalized = severity.toLowerCase();
        if (normalized === 'critical')
            return 'critical';
        if (normalized === 'high')
            return 'high';
        if (normalized === 'medium')
            return 'medium';
        return 'low';
    }
    if (typeof severity === 'number') {
        if (severity >= 0.9)
            return 'critical';
        if (severity >= 0.7)
            return 'high';
        if (severity >= 0.4)
            return 'medium';
        return 'low';
    }
    return 'medium';
}
/**
 * Generate recommendations based on metrics and anomalies
 */
function generateRecommendations(metrics, anomalies) {
    const recommendations = [];
    if (metrics.accuracy < 0.8) {
        recommendations.push('Consider retraining with additional data to improve accuracy');
    }
    if (metrics.confidence < 0.85) {
        recommendations.push('Model confidence is low - review training data quality');
    }
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
    if (criticalAnomalies.length > 0) {
        recommendations.push(`${criticalAnomalies.length} critical anomalies detected - immediate review recommended`);
    }
    const highAnomalies = anomalies.filter(a => a.severity === 'high');
    if (highAnomalies.length > 3) {
        recommendations.push('High number of anomalies - consider pattern analysis');
    }
    if (recommendations.length === 0) {
        recommendations.push('System performing within normal parameters');
    }
    return recommendations;
}
/**
 * Determine overall system status
 */
function determineStatus(metrics, anomalies) {
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
    if (criticalAnomalies.length > 0 || metrics.accuracy < 0.7) {
        return 'critical';
    }
    const highAnomalies = anomalies.filter(a => a.severity === 'high');
    if (highAnomalies.length > 2 || metrics.accuracy < 0.8 || metrics.confidence < 0.8) {
        return 'warning';
    }
    return 'healthy';
}
export function transformTimeSeries(data) {
    return data.map(point => ({
        timestamp: point.timestamp || point.time || new Date().toISOString(),
        value: point.value || point.score || 0,
    }));
}
