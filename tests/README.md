# Test Suite Documentation

Comprehensive test suite for the Iris Prime API, covering authentication, rate limiting, caching, and API endpoints.

## Test Structure

```
tests/
├── utils/
│   ├── setup.ts         # Test setup utilities and helpers
│   └── assertions.ts    # Custom assertions and benchmarking
├── kv.test.ts          # KV/cache integration tests
├── rate-limit.test.ts  # Rate limiting tests
├── api.test.ts         # API endpoint tests
├── e2e.test.ts         # End-to-end flow tests
├── performance.test.ts # Performance benchmarks
└── README.md           # This file
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode
```bash
npm run test:watch
```

### By Category
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Performance benchmarks
npm run test:performance
```

### With Coverage
```bash
npm run test:coverage
```

## Test Categories

### 1. KV/Cache Tests (`kv.test.ts`)

Tests caching behavior for authentication:

- ✅ Cache hit/miss scenarios
- ✅ TTL expiration handling
- ✅ Concurrent access patterns
- ✅ Fallback behavior when KV unavailable
- ✅ Key prefix isolation
- ✅ Performance benchmarks (P99 < 50ms)

**Key Tests:**
- Auth cache speedup (2x+ faster)
- Cache consistency under concurrent load
- TTL validation and refresh
- Mock Vercel KV implementation

### 2. Rate Limiting Tests (`rate-limit.test.ts`)

Tests token bucket rate limiting:

- ✅ Token bucket algorithm correctness
- ✅ Reset window behavior
- ✅ IP + API key dual limiting
- ✅ Concurrent request handling
- ✅ Edge cases (clock skew, window boundaries)
- ✅ Performance (P99 < 5ms)

**Key Tests:**
- Exactly N requests allowed per window
- Automatic reset after window expires
- Isolated rate limits per IP/key
- High concurrency correctness

### 3. API Tests (`api.test.ts`)

Tests API endpoints and business logic:

- ✅ Authentication and authorization
- ✅ Input validation (Zod schemas)
- ✅ API key management (CRUD)
- ✅ Error handling
- ✅ Race conditions
- ✅ Query performance

**Key Tests:**
- Valid/invalid API key handling
- Revoked key rejection
- Concurrent API key operations
- Batch validation performance

### 4. E2E Tests (`e2e.test.ts`)

Tests complete request flows:

- ✅ Auth → Rate Limit → Validation → Response
- ✅ Cache warming and invalidation
- ✅ Error recovery scenarios
- ✅ Multi-step workflows
- ✅ Burst traffic patterns

**Key Tests:**
- Complete request flow (< 150ms total)
- Cache invalidation on key revocation
- Recovery from transient failures
- Mixed success/failure scenarios

### 5. Performance Tests (`performance.test.ts`)

Validates performance SLAs:

- ✅ Auth with cache: P99 < 50ms
- ✅ Rate limiting: P99 < 5ms
- ✅ Full flow: P99 < 100ms
- ✅ Throughput: 1000+ req/sec
- ✅ Memory stability

**Key Benchmarks:**
- Cache speedup measurement
- Sustained concurrent load
- Scaling with key count
- Memory leak detection

## Coverage Goals

| Metric     | Target | Current |
|------------|--------|---------|
| Lines      | 90%    | TBD     |
| Functions  | 90%    | TBD     |
| Branches   | 85%    | TBD     |
| Statements | 90%    | TBD     |

## Performance SLAs

| Operation          | P50    | P95    | P99    |
|-------------------|--------|--------|--------|
| Auth (cached)     | < 5ms  | < 10ms | < 50ms |
| Auth (uncached)   | -      | -      | < 200ms|
| Rate limiting     | < 1ms  | < 2ms  | < 5ms  |
| Validation        | -      | -      | < 5ms  |
| Full request flow | < 10ms | < 50ms | < 100ms|

## Test Utilities

### Setup Utilities (`utils/setup.ts`)

```typescript
// Create test environment
const env = await setupTestEnvironment(numProjects);

// Create test project with API key
const project = await createTestProject({ name: 'Test' });

// Mock Vercel KV
const kv = new MockVercelKV();
await kv.set('key', 'value', { ex: 60 });

// Create mock requests
const request = createMockRequest({
  headers: { Authorization: `Bearer ${apiKey}` },
  body: { expertId: 'test' },
});
```

### Assertion Utilities (`utils/assertions.ts`)

```typescript
// Performance assertions
assertLatencyUnder(duration, 100, 'Operation');
assertCacheHit(cachedLatency, uncachedLatency);

// Benchmark functions
const { stats } = await benchmark(fn, 100);
assertPerformanceSLA(stats, { p99: 50 });

// Response assertions
assertAuthSuccess(response, projectId);
assertRateLimited(response);
assertValidationError(response, 'fieldName');
```

## Writing New Tests

### Unit Test Template

```typescript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  it('[unit] should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Integration Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestEnvironment } from './utils/setup.js';

describe('Feature Integration', () => {
  let env;

  beforeEach(async () => {
    env = await setupTestEnvironment(1);
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it('[integration] should integrate with database', async () => {
    const project = env.projects[0];
    // Test logic here
  });
});
```

### Performance Test Template

```typescript
import { benchmark, assertPerformanceSLA } from './utils/assertions.js';

it('[performance] should meet SLA', async () => {
  const { stats } = await benchmark(async () => {
    await operationUnderTest();
  }, 100);

  assertPerformanceSLA(stats, {
    p50: 10,
    p95: 50,
    p99: 100,
  });
});
```

## CI/CD Integration

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request
- Manual workflow dispatch

### GitHub Actions Workflow

```yaml
jobs:
  test:
    - Unit tests
    - Integration tests
    - E2E tests

  coverage:
    - Generate coverage report
    - Upload to Codecov
    - Enforce thresholds

  performance:
    - Run benchmarks
    - Comment on PR with results

  build:
    - Verify build succeeds
```

## Environment Variables

Required for tests:

```bash
# Supabase (optional for local testing)
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=your-key-here

# Test-specific (optional)
TEST_SUPABASE_URL=http://localhost:54321
TEST_SUPABASE_KEY=test-key
NODE_ENV=test
```

## Debugging Tests

### Run Single Test File
```bash
npx vitest run tests/kv.test.ts
```

### Run Single Test
```bash
npx vitest run -t "should cache API key"
```

### Debug Mode
```bash
DEBUG=* npm test
```

### Watch Mode for Development
```bash
npm run test:watch
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always cleanup resources in `afterEach`
3. **Labels**: Use `[unit]`, `[integration]`, `[e2e]`, `[performance]` tags
4. **Assertions**: Use custom assertions for domain logic
5. **Performance**: Benchmark critical paths
6. **Documentation**: Add comments for complex test logic

## Troubleshooting

### Tests Timing Out
- Increase timeout in `vitest.config.ts`
- Check for hanging async operations
- Ensure cleanup happens in `afterEach`

### Flaky Tests
- Check for race conditions
- Add proper waits for async operations
- Isolate test data properly

### Coverage Issues
- Check excluded files in `vitest.config.ts`
- Run `npm run test:coverage` to see report
- Focus on critical paths first

## Contributing

When adding new features:

1. Write tests first (TDD)
2. Ensure >90% coverage for new code
3. Add performance benchmarks for critical paths
4. Update this README if adding new test categories
5. Run full test suite before submitting PR

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Performance Testing Guide](https://web.dev/performance/)
