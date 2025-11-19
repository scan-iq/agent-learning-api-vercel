/**
 * Request validation for iris-prime-api
 *
 * Validates incoming event payloads using runtime type checking
 */
import { ValidationError } from './errors';
/**
 * Helper to check if value is a valid string
 */
function isString(value) {
    return typeof value === 'string' && value.length > 0;
}
/**
 * Helper to check if value is a valid object
 */
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * Helper to check if value is a valid array
 */
function isArray(value) {
    return Array.isArray(value);
}
/**
 * Helper to validate timestamp
 */
function isValidTimestamp(value) {
    if (typeof value !== 'string')
        return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
}
/**
 * Validate telemetry event payload
 */
export function validateTelemetryEvent(data) {
    if (!isObject(data)) {
        throw new ValidationError('Invalid telemetry event: must be an object', {
            received: typeof data,
        });
    }
    // Required fields
    if (!isString(data.projectId)) {
        throw new ValidationError('Invalid telemetry event: projectId is required and must be a non-empty string', {
            field: 'projectId',
            received: typeof data.projectId,
        });
    }
    if (!isString(data.event)) {
        throw new ValidationError('Invalid telemetry event: event is required and must be a non-empty string', {
            field: 'event',
            received: typeof data.event,
        });
    }
    // Optional fields
    if (data.agentId !== undefined && !isString(data.agentId)) {
        throw new ValidationError('Invalid telemetry event: agentId must be a non-empty string', {
            field: 'agentId',
            received: typeof data.agentId,
        });
    }
    if (data.sessionId !== undefined && !isString(data.sessionId)) {
        throw new ValidationError('Invalid telemetry event: sessionId must be a non-empty string', {
            field: 'sessionId',
            received: typeof data.sessionId,
        });
    }
    if (data.metadata !== undefined && !isObject(data.metadata)) {
        throw new ValidationError('Invalid telemetry event: metadata must be an object', {
            field: 'metadata',
            received: typeof data.metadata,
        });
    }
    if (data.timestamp !== undefined && !isValidTimestamp(data.timestamp)) {
        throw new ValidationError('Invalid telemetry event: timestamp must be a valid ISO 8601 date string', {
            field: 'timestamp',
            received: data.timestamp,
        });
    }
    return {
        projectId: data.projectId,
        event: data.event,
        agentId: data.agentId,
        sessionId: data.sessionId,
        metadata: data.metadata,
        timestamp: data.timestamp || new Date().toISOString(),
    };
}
/**
 * Validate signature event payload
 */
export function validateSignatureEvent(data) {
    if (!isObject(data)) {
        throw new ValidationError('Invalid signature event: must be an object', {
            received: typeof data,
        });
    }
    // Required fields
    if (!isString(data.projectId)) {
        throw new ValidationError('Invalid signature event: projectId is required', {
            field: 'projectId',
        });
    }
    if (!isString(data.signatureName)) {
        throw new ValidationError('Invalid signature event: signatureName is required', {
            field: 'signatureName',
        });
    }
    if (!isString(data.signature)) {
        throw new ValidationError('Invalid signature event: signature is required', {
            field: 'signature',
        });
    }
    if (!isArray(data.inputFields)) {
        throw new ValidationError('Invalid signature event: inputFields must be an array', {
            field: 'inputFields',
        });
    }
    if (!isArray(data.outputFields)) {
        throw new ValidationError('Invalid signature event: outputFields must be an array', {
            field: 'outputFields',
        });
    }
    // Validate field structures
    for (const field of data.inputFields) {
        if (!isObject(field) || !isString(field.name) || !isString(field.type)) {
            throw new ValidationError('Invalid signature event: inputFields must contain objects with name and type', {
                field: 'inputFields',
                invalidEntry: field,
            });
        }
    }
    for (const field of data.outputFields) {
        if (!isObject(field) || !isString(field.name) || !isString(field.type)) {
            throw new ValidationError('Invalid signature event: outputFields must contain objects with name and type', {
                field: 'outputFields',
                invalidEntry: field,
            });
        }
    }
    if (data.metadata !== undefined && !isObject(data.metadata)) {
        throw new ValidationError('Invalid signature event: metadata must be an object', {
            field: 'metadata',
        });
    }
    if (data.timestamp !== undefined && !isValidTimestamp(data.timestamp)) {
        throw new ValidationError('Invalid signature event: timestamp must be a valid ISO 8601 date string', {
            field: 'timestamp',
        });
    }
    return {
        projectId: data.projectId,
        signatureName: data.signatureName,
        signature: data.signature,
        inputFields: data.inputFields,
        outputFields: data.outputFields,
        metadata: data.metadata,
        timestamp: data.timestamp || new Date().toISOString(),
    };
}
/**
 * Validate reflexion event payload
 */
export function validateReflexionEvent(data) {
    if (!isObject(data)) {
        throw new ValidationError('Invalid reflexion event: must be an object', {
            received: typeof data,
        });
    }
    // Required fields
    if (!isString(data.projectId)) {
        throw new ValidationError('Invalid reflexion event: projectId is required', {
            field: 'projectId',
        });
    }
    if (!isString(data.input)) {
        throw new ValidationError('Invalid reflexion event: input is required', {
            field: 'input',
        });
    }
    if (!isString(data.output)) {
        throw new ValidationError('Invalid reflexion event: output is required', {
            field: 'output',
        });
    }
    const validVerdicts = ['correct', 'incorrect', 'partial'];
    if (!validVerdicts.includes(data.verdict)) {
        throw new ValidationError('Invalid reflexion event: verdict must be "correct", "incorrect", or "partial"', {
            field: 'verdict',
            received: data.verdict,
            validOptions: validVerdicts,
        });
    }
    // Optional fields
    if (data.agentId !== undefined && !isString(data.agentId)) {
        throw new ValidationError('Invalid reflexion event: agentId must be a non-empty string', {
            field: 'agentId',
        });
    }
    if (data.sessionId !== undefined && !isString(data.sessionId)) {
        throw new ValidationError('Invalid reflexion event: sessionId must be a non-empty string', {
            field: 'sessionId',
        });
    }
    if (data.reasoning !== undefined && !isString(data.reasoning)) {
        throw new ValidationError('Invalid reflexion event: reasoning must be a string', {
            field: 'reasoning',
        });
    }
    if (data.metadata !== undefined && !isObject(data.metadata)) {
        throw new ValidationError('Invalid reflexion event: metadata must be an object', {
            field: 'metadata',
        });
    }
    if (data.timestamp !== undefined && !isValidTimestamp(data.timestamp)) {
        throw new ValidationError('Invalid reflexion event: timestamp must be a valid ISO 8601 date string', {
            field: 'timestamp',
        });
    }
    return {
        projectId: data.projectId,
        input: data.input,
        output: data.output,
        verdict: data.verdict,
        agentId: data.agentId,
        sessionId: data.sessionId,
        reasoning: data.reasoning,
        metadata: data.metadata,
        timestamp: data.timestamp || new Date().toISOString(),
    };
}
/**
 * Validate consensus event payload
 */
export function validateConsensusEvent(data) {
    if (!isObject(data)) {
        throw new ValidationError('Invalid consensus event: must be an object', {
            received: typeof data,
        });
    }
    // Required fields
    if (!isString(data.projectId)) {
        throw new ValidationError('Invalid consensus event: projectId is required', {
            field: 'projectId',
        });
    }
    if (!isString(data.consensusId)) {
        throw new ValidationError('Invalid consensus event: consensusId is required', {
            field: 'consensusId',
        });
    }
    const validVotes = ['approve', 'reject', 'abstain'];
    if (!validVotes.includes(data.vote)) {
        throw new ValidationError('Invalid consensus event: vote must be "approve", "reject", or "abstain"', {
            field: 'vote',
            received: data.vote,
            validOptions: validVotes,
        });
    }
    // Optional fields
    if (data.agentId !== undefined && !isString(data.agentId)) {
        throw new ValidationError('Invalid consensus event: agentId must be a non-empty string', {
            field: 'agentId',
        });
    }
    if (data.reasoning !== undefined && !isString(data.reasoning)) {
        throw new ValidationError('Invalid consensus event: reasoning must be a string', {
            field: 'reasoning',
        });
    }
    if (data.metadata !== undefined && !isObject(data.metadata)) {
        throw new ValidationError('Invalid consensus event: metadata must be an object', {
            field: 'metadata',
        });
    }
    if (data.timestamp !== undefined && !isValidTimestamp(data.timestamp)) {
        throw new ValidationError('Invalid consensus event: timestamp must be a valid ISO 8601 date string', {
            field: 'timestamp',
        });
    }
    return {
        projectId: data.projectId,
        consensusId: data.consensusId,
        vote: data.vote,
        agentId: data.agentId,
        reasoning: data.reasoning,
        metadata: data.metadata,
        timestamp: data.timestamp || new Date().toISOString(),
    };
}
/**
 * Parse and validate JSON request body
 */
export async function parseJsonBody(request, validator) {
    let body;
    try {
        body = await request.json();
    }
    catch (error) {
        throw new ValidationError('Invalid JSON in request body', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
    return validator(body);
}
/**
 * Validate query parameters
 */
export function validateQueryParams(url, required = [], optional = []) {
    const params = {};
    // Check required params
    for (const param of required) {
        const value = url.searchParams.get(param);
        if (!value) {
            throw new ValidationError(`Missing required query parameter: ${param}`, {
                field: param,
                required,
            });
        }
        params[param] = value;
    }
    // Get optional params
    for (const param of optional) {
        const value = url.searchParams.get(param);
        if (value) {
            params[param] = value;
        }
    }
    return params;
}
