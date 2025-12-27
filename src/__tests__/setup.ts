import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
// Use regular DB name for integration tests, or skip them if DB not available
process.env.DB_NAME = process.env.DB_NAME || 'collab_workspace';
process.env.SKIP_INTEGRATION_TESTS = process.env.SKIP_INTEGRATION_TESTS || 'false';

// Mock logger to avoid console noise during tests
jest.mock('../shared/utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(), // Required by httpLogger middleware
  };
  return {
    __esModule: true,
    default: mockLogger,
    stream: {
      write: jest.fn(),
    },
  };
});

// Mock Redis to avoid connection issues in tests
jest.mock('../config/redis', () => ({
  getRedisClient: jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(() => Promise.resolve([])),
    quit: jest.fn(),
  })),
  getRedisSubscriber: jest.fn(() => ({
    subscribe: jest.fn(),
    quit: jest.fn(),
  })),
  getRedisPublisher: jest.fn(() => ({
    publish: jest.fn(),
    quit: jest.fn(),
  })),
  closeRedisConnections: jest.fn(),
}));

// Mock rate limiter for integration tests
jest.mock('../shared/middleware/rateLimiter.middleware', () => ({
  generalRateLimiter: (_req: any, _res: any, next: any) => next(),
  authRateLimiter: (_req: any, _res: any, next: any) => next(),
}));

// Mock CacheService for unit tests
jest.mock('../shared/utils/cache.util', () => ({
  CacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
    delete: jest.fn(),
    invalidatePattern: jest.fn(),
    invalidateWorkspace: jest.fn(),
    invalidateProject: jest.fn(),
    invalidateUser: jest.fn(),
    workspaceKey: jest.fn((id) => `workspace:${id}`),
    workspaceListKey: jest.fn((userId) => `workspace:list:user:${userId}`),
    projectKey: jest.fn((id) => `project:${id}`),
    projectListKey: jest.fn((workspaceId) => `project:workspace:${workspaceId}:list`),
    memberRoleKey: jest.fn((workspaceId, userId) => `member:role:${workspaceId}:${userId}`),
    permissionKey: jest.fn((workspaceId, userId, permission) =>
      `permission:${workspaceId}:${userId}:${permission}`
    ),
  },
}));

