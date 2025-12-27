import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database';
import {
  WorkspaceInvite,
  InviteStatus,
} from '../../shared/entities/workspace-invite.entity';
import { WorkspaceMember } from '../../shared/entities/workspace-member.entity';
import { Workspace } from '../../shared/entities/workspace.entity';
import { User } from '../../shared/entities/user.entity';
import { WorkspaceRole } from '../../shared/types/roles';
import { TokenUtil } from '../../shared/utils/token.util';
import { CacheService } from '../../shared/utils/cache.util';
import logger from '../../shared/utils/logger';

export class InviteService {
  private static inviteRepository: Repository<WorkspaceInvite> =
    AppDataSource.getRepository(WorkspaceInvite);
  private static memberRepository: Repository<WorkspaceMember> =
    AppDataSource.getRepository(WorkspaceMember);
  private static workspaceRepository: Repository<Workspace> =
    AppDataSource.getRepository(Workspace);
  private static userRepository: Repository<User> =
    AppDataSource.getRepository(User);

  static async sendInvite(
    workspaceId: string,
    email: string,
    role: WorkspaceRole,
    invitedById: string
  ): Promise<WorkspaceInvite> {
    logger.info('Sending workspace invite', {
      workspaceId,
      email,
      role,
      invitedById,
    });

    // Verify workspace exists
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });
    if (!workspace) {
      logger.warn('Invite failed: Workspace not found', { workspaceId });
      throw new Error('Workspace not found');
    }

    // Check if user exists and is already a member
    const invitedUser = await this.userRepository.findOne({ where: { email } });
    if (invitedUser) {
      const existingMember = await this.memberRepository.findOne({
        where: { workspaceId, userId: invitedUser.id },
      });
      if (existingMember) {
        logger.warn('Invite failed: User is already a member', {
          workspaceId,
          email,
        });
        throw new Error('User is already a member of this workspace');
      }
    }

    // Check if there's a pending invite
    const existingInvite = await this.inviteRepository.findOne({
      where: { workspaceId, email, status: InviteStatus.PENDING },
    });
    if (existingInvite) {
      logger.warn('Invite failed: Pending invite already exists', {
        workspaceId,
        email,
      });
      throw new Error('A pending invite already exists for this user');
    }

    // Generate token and set expiration (7 days)
    const token = TokenUtil.generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = this.inviteRepository.create({
      workspaceId,
      email,
      role,
      invitedById,
      token,
      status: InviteStatus.PENDING,
      expiresAt,
    });

    const savedInvite = await this.inviteRepository.save(invite);
    logger.info('Invite sent successfully', {
      inviteId: savedInvite.id,
      email,
    });

    return savedInvite;
  }

  static async acceptInvite(
    token: string,
    userId: string
  ): Promise<WorkspaceMember> {
    logger.info('Accepting workspace invite', { token, userId });

    const invite = await this.inviteRepository.findOne({
      where: { token },
      relations: ['workspace'],
    });

    if (!invite) {
      logger.warn('Invite acceptance failed: Invite not found', { token });
      throw new Error('Invalid invite token');
    }

    if (invite.status !== InviteStatus.PENDING) {
      logger.warn('Invite acceptance failed: Invite not pending', {
        token,
        status: invite.status,
      });
      throw new Error('Invite has already been processed');
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      invite.status = InviteStatus.EXPIRED;
      await this.inviteRepository.save(invite);
      logger.warn('Invite acceptance failed: Invite expired', { token });
      throw new Error('Invite has expired');
    }

    // Verify user email matches invite email and check membership (parallel queries)
    const [user, existingMember] = await Promise.all([
      this.userRepository.findOne({ where: { id: userId } }),
      this.memberRepository.findOne({
        where: { workspaceId: invite.workspaceId, userId },
      }),
    ]);

    if (!user || user.email !== invite.email) {
      logger.warn('Invite acceptance failed: Email mismatch', {
        token,
        userEmail: user?.email,
        inviteEmail: invite.email,
      });
      throw new Error('This invite is not for your account');
    }
    if (existingMember) {
      invite.status = InviteStatus.ACCEPTED;
      await this.inviteRepository.save(invite);
      logger.warn('Invite acceptance: User already a member', {
        token,
        userId,
      });
      throw new Error('You are already a member of this workspace');
    }

    // Create workspace member
    const member = this.memberRepository.create({
      workspaceId: invite.workspaceId,
      userId,
      role: invite.role,
    });

    const savedMember = await this.memberRepository.save(member);

    // Update invite status
    invite.status = InviteStatus.ACCEPTED;
    await this.inviteRepository.save(invite);

    // Invalidate cache
    await Promise.all([
      CacheService.invalidateWorkspace(invite.workspaceId),
      CacheService.invalidateUser(userId),
    ]);

    logger.info('Invite accepted successfully', {
      inviteId: invite.id,
      memberId: savedMember.id,
    });

    return savedMember;
  }

  static async declineInvite(token: string, userId: string): Promise<void> {
    logger.info('Declining workspace invite', { token, userId });

    const invite = await this.inviteRepository.findOne({
      where: { token },
    });

    if (!invite) {
      logger.warn('Invite decline failed: Invite not found', { token });
      throw new Error('Invalid invite token');
    }

    if (invite.status !== InviteStatus.PENDING) {
      logger.warn('Invite decline failed: Invite not pending', {
        token,
        status: invite.status,
      });
      throw new Error('Invite has already been processed');
    }

    // Verify user email matches invite email
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || user.email !== invite.email) {
      logger.warn('Invite decline failed: Email mismatch', {
        token,
        userEmail: user?.email,
        inviteEmail: invite.email,
      });
      throw new Error('This invite is not for your account');
    }

    invite.status = InviteStatus.DECLINED;
    await this.inviteRepository.save(invite);

    logger.info('Invite declined successfully', { inviteId: invite.id });
  }

  static async getInvitesByWorkspace(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceInvite[]> {
    logger.debug('Fetching invites for workspace', { workspaceId, userId });

    // Verify user has permission (owner or collaborator can view invites)
    const member = await this.memberRepository.findOne({
      where: { workspaceId, userId },
    });

    if (!member) {
      logger.warn('Failed to fetch invites: Not a member', {
        workspaceId,
        userId,
      });
      throw new Error('Access denied');
    }

    const invites = await this.inviteRepository.find({
      where: { workspaceId },
      relations: ['invitedBy'],
      order: { createdAt: 'DESC' },
    });

    return invites;
  }

  static async cancelInvite(
    inviteId: string,
    workspaceId: string,
    userId: string
  ): Promise<void> {
    logger.info('Cancelling invite', { inviteId, workspaceId, userId });

    // Verify user has permission (owner or the person who sent the invite)
    const member = await this.memberRepository.findOne({
      where: { workspaceId, userId },
    });

    const invite = await this.inviteRepository.findOne({
      where: { id: inviteId, workspaceId },
    });

    if (!invite) {
      logger.warn('Invite cancellation failed: Invite not found', { inviteId });
      throw new Error('Invite not found');
    }

    if (
      !member ||
      (member.role !== WorkspaceRole.OWNER && invite.invitedById !== userId)
    ) {
      logger.warn('Invite cancellation failed: Access denied', {
        inviteId,
        userId,
        memberRole: member?.role,
      });
      throw new Error('Access denied');
    }

    if (invite.status !== InviteStatus.PENDING) {
      logger.warn('Invite cancellation failed: Invite not pending', {
        inviteId,
        status: invite.status,
      });
      throw new Error('Can only cancel pending invites');
    }

    await this.inviteRepository.remove(invite);
    logger.info('Invite cancelled successfully', { inviteId });
  }
}
