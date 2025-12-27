import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { WorkspaceMember } from '../../shared/entities/workspace-member.entity';
import { Workspace } from '../../shared/entities/workspace.entity';
import { WorkspaceRole, RolePermissions } from '../../shared/types/roles';
import { CacheService } from '../../shared/utils/cache.util';
import logger from '../../shared/utils/logger';

export class RoleService {
  private static memberRepository: Repository<WorkspaceMember> =
    AppDataSource.getRepository(WorkspaceMember);
  private static workspaceRepository: Repository<Workspace> =
    AppDataSource.getRepository(Workspace);

  static async updateMemberRole(
    workspaceId: string,
    memberId: string,
    newRole: WorkspaceRole,
    requestedBy: string
  ): Promise<WorkspaceMember> {
    logger.info('Updating member role', {
      workspaceId,
      memberId,
      newRole,
      requestedBy,
    });

    // Verify requester has permission (only owner can update roles)
    const requesterMember = await this.memberRepository.findOne({
      where: { workspaceId, userId: requestedBy },
    });

    if (!requesterMember || requesterMember.role !== WorkspaceRole.OWNER) {
      logger.warn('Role update failed: Access denied', {
        workspaceId,
        requestedBy,
        requesterRole: requesterMember?.role,
      });
      throw new Error('Only workspace owners can update member roles');
    }

    // Find the member to update
    const member = await this.memberRepository.findOne({
      where: { id: memberId, workspaceId },
      relations: ['user'],
    });

    if (!member) {
      logger.warn('Role update failed: Member not found', {
        workspaceId,
        memberId,
      });
      throw new Error('Member not found');
    }

    // Prevent changing owner role
    if (member.role === WorkspaceRole.OWNER) {
      logger.warn('Role update failed: Cannot change owner role', {
        workspaceId,
        memberId,
      });
      throw new Error('Cannot change the role of the workspace owner');
    }

    // Prevent changing to owner (only one owner allowed)
    if (newRole === WorkspaceRole.OWNER) {
      logger.warn('Role update failed: Cannot assign owner role', {
        workspaceId,
        memberId,
      });
      throw new Error(
        'Cannot assign owner role. Workspace can only have one owner.'
      );
    }

    member.role = newRole;
    const updatedMember = await this.memberRepository.save(member);

    logger.info('Member role updated successfully', {
      memberId: updatedMember.id,
      newRole: updatedMember.role,
    });

    // Invalidate cache for this member's role and permissions
    await Promise.all([
      CacheService.delete(
        CacheService.memberRoleKey(workspaceId, member.userId)
      ),
      CacheService.invalidatePattern(
        CacheService.permissionKey(workspaceId, member.userId, '*')
      ),
    ]);

    return updatedMember;
  }

  static async removeMember(
    workspaceId: string,
    memberId: string,
    requestedBy: string
  ): Promise<void> {
    logger.info('Removing member from workspace', {
      workspaceId,
      memberId,
      requestedBy,
    });

    // Verify requester has permission (only owner can remove members)
    const requesterMember = await this.memberRepository.findOne({
      where: { workspaceId, userId: requestedBy },
    });

    if (!requesterMember || requesterMember.role !== WorkspaceRole.OWNER) {
      logger.warn('Member removal failed: Access denied', {
        workspaceId,
        requestedBy,
        requesterRole: requesterMember?.role,
      });
      throw new Error('Only workspace owners can remove members');
    }

    // Find the member to remove
    const member = await this.memberRepository.findOne({
      where: { id: memberId, workspaceId },
    });

    if (!member) {
      logger.warn('Member removal failed: Member not found', {
        workspaceId,
        memberId,
      });
      throw new Error('Member not found');
    }

    // Prevent removing owner
    if (member.role === WorkspaceRole.OWNER) {
      logger.warn('Member removal failed: Cannot remove owner', {
        workspaceId,
        memberId,
      });
      throw new Error('Cannot remove the workspace owner');
    }

    await this.memberRepository.remove(member);
    logger.info('Member removed successfully', { memberId });

    // Invalidate cache for this member
    await Promise.all([
      CacheService.delete(
        CacheService.memberRoleKey(workspaceId, member.userId)
      ),
      CacheService.invalidatePattern(
        CacheService.permissionKey(workspaceId, member.userId, '*')
      ),
    ]);
  }

  static async getWorkspaceMembers(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMember[]> {
    logger.debug('Fetching workspace members', { workspaceId, userId });

    // Verify user is a member
    const member = await this.memberRepository.findOne({
      where: { workspaceId, userId },
    });

    if (!member) {
      logger.warn('Failed to fetch members: Not a member', {
        workspaceId,
        userId,
      });
      throw new Error('Access denied');
    }

    const members = await this.memberRepository.find({
      where: { workspaceId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    return members;
  }

  static async getMemberRole(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceRole | null> {
    // Try to get from cache
    const cacheKey = CacheService.memberRoleKey(workspaceId, userId);
    const cached = await CacheService.get<WorkspaceRole>(cacheKey);
    if (cached !== null) {
      logger.debug('Member role retrieved from cache', { workspaceId, userId });
      return cached;
    }

    // Check if user is the workspace owner
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId, ownerId: userId },
    });
    if (workspace) {
      await CacheService.set(cacheKey, WorkspaceRole.OWNER, 1800); // 30 minutes
      return WorkspaceRole.OWNER;
    }

    // Check if user is a member
    const member = await this.memberRepository.findOne({
      where: { workspaceId, userId },
    });

    const role = member ? member.role : null;
    if (role) {
      await CacheService.set(cacheKey, role, 1800); // 30 minutes
    }

    return role;
  }

  static async hasPermission(
    workspaceId: string,
    userId: string,
    permission: keyof RolePermissions
  ): Promise<boolean> {
    // Try to get from cache
    const cacheKey = CacheService.permissionKey(
      workspaceId,
      userId,
      permission
    );
    const cached = await CacheService.get<boolean>(cacheKey);
    if (cached !== null) {
      logger.debug('Permission check retrieved from cache', {
        workspaceId,
        userId,
        permission,
      });
      return cached;
    }

    const role = await this.getMemberRole(workspaceId, userId);
    if (!role) {
      await CacheService.set(cacheKey, false, 1800); // 30 minutes
      return false;
    }

    const { ROLE_PERMISSIONS } = await import('../../shared/types/roles');
    const permissions = ROLE_PERMISSIONS[role];
    const hasPermission = permissions ? permissions[permission] : false;

    // Cache the result
    await CacheService.set(cacheKey, hasPermission, 1800); // 30 minutes

    return hasPermission;
  }
}
