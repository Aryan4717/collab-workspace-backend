import { getRedisClient } from '../../config/redis';
import logger from './logger';

export class CacheService {
  private static readonly DEFAULT_TTL = 3600; // 1 hour in seconds
  private static readonly redis = getRedisClient();

  /**
   * Get value from cache
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache get error', { key, error: (error as Error).message });
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  static async set(
    key: string,
    value: unknown,
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttl, serialized);
    } catch (error) {
      logger.error('Cache set error', { key, error: (error as Error).message });
    }
  }

  /**
   * Delete a specific key from cache
   */
  static async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error('Cache delete error', { key, error: (error as Error).message });
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.debug('Cache invalidated', { pattern, count: keys.length });
      }
    } catch (error) {
      logger.error('Cache invalidate pattern error', {
        pattern,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Invalidate all cache entries for a workspace
   */
  static async invalidateWorkspace(workspaceId: string): Promise<void> {
    await Promise.all([
      this.invalidatePattern(`workspace:${workspaceId}:*`),
      this.invalidatePattern(`workspace:list:user:*`),
      this.invalidatePattern(`project:workspace:${workspaceId}:*`),
      this.invalidatePattern(`member:workspace:${workspaceId}:*`),
      this.invalidatePattern(`permission:${workspaceId}:*`),
    ]);
  }

  /**
   * Invalidate all cache entries for a project
   */
  static async invalidateProject(projectId: string, workspaceId: string): Promise<void> {
    await Promise.all([
      this.delete(`project:${projectId}`),
      this.invalidatePattern(`project:workspace:${workspaceId}:*`),
    ]);
  }

  /**
   * Invalidate user-related cache
   */
  static async invalidateUser(userId: string): Promise<void> {
    await Promise.all([
      this.invalidatePattern(`workspace:list:user:${userId}`),
      this.invalidatePattern(`permission:*:${userId}`),
    ]);
  }

  /**
   * Generate cache key for workspace
   */
  static workspaceKey(workspaceId: string): string {
    return `workspace:${workspaceId}`;
  }

  /**
   * Generate cache key for workspace list
   */
  static workspaceListKey(userId: string): string {
    return `workspace:list:user:${userId}`;
  }

  /**
   * Generate cache key for project
   */
  static projectKey(projectId: string): string {
    return `project:${projectId}`;
  }

  /**
   * Generate cache key for project list
   */
  static projectListKey(workspaceId: string): string {
    return `project:workspace:${workspaceId}:list`;
  }

  /**
   * Generate cache key for member role
   */
  static memberRoleKey(workspaceId: string, userId: string): string {
    return `member:role:${workspaceId}:${userId}`;
  }

  /**
   * Generate cache key for permission check
   */
  static permissionKey(workspaceId: string, userId: string, permission: string): string {
    return `permission:${workspaceId}:${userId}:${permission}`;
  }
}

