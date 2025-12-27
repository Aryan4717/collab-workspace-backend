import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database';
import {
  Workspace,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceResponse,
} from '../../shared/entities/workspace.entity';
import { User } from '../../shared/entities/user.entity';
import { RoleService } from '../role/role.service';
import { CacheService } from '../../shared/utils/cache.util';
import logger from '../../shared/utils/logger';

export class WorkspaceService {
  private static workspaceRepository: Repository<Workspace> =
    AppDataSource.getRepository(Workspace);
  private static userRepository: Repository<User> = AppDataSource.getRepository(User);

  static async create(
    workspaceData: CreateWorkspaceDto,
    ownerId: string
  ): Promise<WorkspaceResponse> {
    logger.info('Creating workspace', { name: workspaceData.name, ownerId });

    // Verify owner exists
    const owner = await this.userRepository.findOne({ where: { id: ownerId } });
    if (!owner) {
      logger.warn('Workspace creation failed: Owner not found', { ownerId });
      throw new Error('Owner not found');
    }

    // Check if workspace with same name already exists for this owner
    const existingWorkspace = await this.workspaceRepository.findOne({
      where: { name: workspaceData.name, ownerId },
    });
    if (existingWorkspace) {
      logger.warn('Workspace creation failed: Workspace already exists', {
        name: workspaceData.name,
        ownerId,
      });
      throw new Error('Workspace with this name already exists');
    }

    const workspace = this.workspaceRepository.create({
      ...workspaceData,
      ownerId,
    });

    const savedWorkspace = await this.workspaceRepository.save(workspace);

    // Automatically add owner as a member with OWNER role
    const { WorkspaceMember } = await import('../../shared/entities/workspace-member.entity');
    const { WorkspaceRole } = await import('../../shared/types/roles');
    const memberRepository = AppDataSource.getRepository(WorkspaceMember);
    const ownerMember = memberRepository.create({
      workspaceId: savedWorkspace.id,
      userId: ownerId,
      role: WorkspaceRole.OWNER,
    });
    await memberRepository.save(ownerMember);

    logger.info('Workspace created successfully', {
      workspaceId: savedWorkspace.id,
      name: savedWorkspace.name,
    });

    // Invalidate user's workspace list cache
    await CacheService.invalidateUser(ownerId);

    return savedWorkspace.toResponse();
  }

  static async findAll(userId: string): Promise<WorkspaceResponse[]> {
    logger.debug('Fetching all workspaces for user', { userId });

    // Try to get from cache
    const cacheKey = CacheService.workspaceListKey(userId);
    const cached = await CacheService.get<WorkspaceResponse[]>(cacheKey);
    if (cached) {
      logger.debug('Workspace list retrieved from cache', { userId });
      return cached;
    }

    // Fetch from database in parallel
    const [ownedWorkspaces, memberships] = await Promise.all([
      this.workspaceRepository.find({
        where: { ownerId: userId },
        order: { createdAt: 'DESC' },
      }),
      (async () => {
        const { WorkspaceMember } = await import('../../shared/entities/workspace-member.entity');
        const memberRepository = AppDataSource.getRepository(WorkspaceMember);
        return memberRepository.find({
          where: { userId },
          relations: ['workspace'],
          order: { createdAt: 'DESC' },
        });
      })(),
    ]);

    const memberWorkspaces = memberships.map((m) => m.workspace);

    // Combine and deduplicate
    const allWorkspaces = [...ownedWorkspaces];
    memberWorkspaces.forEach((ws) => {
      if (!allWorkspaces.find((w) => w.id === ws.id)) {
        allWorkspaces.push(ws);
      }
    });

    const result = allWorkspaces.map((workspace) => workspace.toResponse());

    // Cache the result (5 minutes TTL for lists)
    await CacheService.set(cacheKey, result, 300);

    return result;
  }

  static async findOne(id: string, userId: string): Promise<WorkspaceResponse> {
    logger.debug('Fetching workspace', { workspaceId: id, userId });

    // Try to get from cache
    const cacheKey = CacheService.workspaceKey(id);
    const cached = await CacheService.get<WorkspaceResponse>(cacheKey);
    if (cached) {
      logger.debug('Workspace retrieved from cache', { workspaceId: id });
      // Still need to check permissions
      const role = await RoleService.getMemberRole(id, userId);
      if (!role && cached.ownerId !== userId) {
        logger.warn('Workspace access denied', { workspaceId: id, userId });
        throw new Error('Access denied');
      }
      return cached;
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id },
      relations: ['projects'],
    });

    if (!workspace) {
      logger.warn('Workspace not found', { workspaceId: id });
      throw new Error('Workspace not found');
    }

    // Check if user has access (owner or member)
    const role = await RoleService.getMemberRole(id, userId);
    if (!role && workspace.ownerId !== userId) {
      logger.warn('Workspace access denied', { workspaceId: id, userId });
      throw new Error('Access denied');
    }

    const result = workspace.toResponse();
    // Cache the result
    await CacheService.set(cacheKey, result);

    return result;
  }

  static async update(
    id: string,
    updateData: UpdateWorkspaceDto,
    userId: string
  ): Promise<WorkspaceResponse> {
    logger.info('Updating workspace', { workspaceId: id, userId });

    const workspace = await this.workspaceRepository.findOne({
      where: { id },
    });

    if (!workspace) {
      logger.warn('Workspace update failed: Workspace not found', {
        workspaceId: id,
      });
      throw new Error('Workspace not found');
    }

    // Check if user has edit permission
    const canEdit = await RoleService.hasPermission(id, userId, 'canEdit');
    if (!canEdit) {
      logger.warn('Workspace update failed: Access denied', {
        workspaceId: id,
        userId,
      });
      throw new Error('Access denied. Insufficient permissions.');
    }

    // Check if new name conflicts with existing workspace (for same owner)
    if (updateData.name && updateData.name !== workspace.name) {
      const existingWorkspace = await this.workspaceRepository.findOne({
        where: { name: updateData.name, ownerId: workspace.ownerId },
      });
      if (existingWorkspace) {
        logger.warn('Workspace update failed: Name already exists', {
          workspaceId: id,
          name: updateData.name,
        });
        throw new Error('Workspace with this name already exists');
      }
    }

    Object.assign(workspace, updateData);
    const updatedWorkspace = await this.workspaceRepository.save(workspace);

    logger.info('Workspace updated successfully', {
      workspaceId: updatedWorkspace.id,
    });

    // Invalidate cache
    await CacheService.invalidateWorkspace(updatedWorkspace.id);

    return updatedWorkspace.toResponse();
  }

  static async delete(id: string, userId: string): Promise<void> {
    logger.info('Deleting workspace', { workspaceId: id, userId });

    const workspace = await this.workspaceRepository.findOne({
      where: { id },
    });

    if (!workspace) {
      logger.warn('Workspace deletion failed: Workspace not found', {
        workspaceId: id,
      });
      throw new Error('Workspace not found');
    }

    // Only owner can delete workspace
    if (workspace.ownerId !== userId) {
      logger.warn('Workspace deletion failed: Only owner can delete', {
        workspaceId: id,
        userId,
      });
      throw new Error('Only workspace owner can delete the workspace');
    }

    await this.workspaceRepository.remove(workspace);
    logger.info('Workspace deleted successfully', { workspaceId: id });

    // Invalidate cache
    await CacheService.invalidateWorkspace(id);
  }

  static async verifyOwnership(workspaceId: string, userId: string): Promise<boolean> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId, ownerId: userId },
    });
    return !!workspace;
  }
}

