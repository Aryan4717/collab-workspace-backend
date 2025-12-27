import { Response } from 'express';
import { RoleService } from './role.service';
import { ApiResponse } from '../../shared/types';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { WorkspaceRole } from '../../shared/types/roles';
import logger from '../../shared/utils/logger';

export const updateMemberRole = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      res.status(401).json(response);
      return;
    }

    const { workspaceId, memberId } = req.params;
    const { role } = req.body;

    if (!role) {
      const response: ApiResponse = {
        success: false,
        error: 'Role is required',
      };
      res.status(400).json(response);
      return;
    }

    if (!Object.values(WorkspaceRole).includes(role)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid role. Must be owner, collaborator, or viewer',
      };
      res.status(400).json(response);
      return;
    }

    const updatedMember = await RoleService.updateMemberRole(
      workspaceId,
      memberId,
      role,
      req.user.userId
    );

    const response: ApiResponse = {
      success: true,
      data: updatedMember.toResponse(),
      message: 'Member role updated successfully',
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Role update failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      workspaceId: req.params.workspaceId,
      memberId: req.params.memberId,
      userId: req.user?.userId,
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update role',
    };
    const statusCode =
      error instanceof Error && error.message.includes('Access denied')
        ? 403
        : 400;
    res.status(statusCode).json(response);
  }
};

export const removeMember = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      res.status(401).json(response);
      return;
    }

    const { workspaceId, memberId } = req.params;
    await RoleService.removeMember(workspaceId, memberId, req.user.userId);

    const response: ApiResponse = {
      success: true,
      message: 'Member removed successfully',
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Member removal failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      workspaceId: req.params.workspaceId,
      memberId: req.params.memberId,
      userId: req.user?.userId,
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove member',
    };
    const statusCode =
      error instanceof Error && error.message.includes('Access denied')
        ? 403
        : 400;
    res.status(statusCode).json(response);
  }
};

export const getWorkspaceMembers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      res.status(401).json(response);
      return;
    }

    const { workspaceId } = req.params;
    const members = await RoleService.getWorkspaceMembers(
      workspaceId,
      req.user.userId
    );

    const response: ApiResponse = {
      success: true,
      data: members.map(member => member.toResponse()),
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to fetch members', {
      error: error instanceof Error ? error.message : 'Unknown error',
      workspaceId: req.params.workspaceId,
      userId: req.user?.userId,
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch members',
    };
    res.status(403).json(response);
  }
};
