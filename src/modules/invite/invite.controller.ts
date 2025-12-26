import { Response } from 'express';
import { InviteService } from './invite.service';
import { ApiResponse } from '../../shared/types';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { WorkspaceRole } from '../../shared/types/roles';
import logger from '../../shared/utils/logger';

export const sendInvite = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const { email, role } = req.body;

    if (!email) {
      const response: ApiResponse = {
        success: false,
        error: 'Email is required',
      };
      res.status(400).json(response);
      return;
    }

    const inviteRole = role || WorkspaceRole.VIEWER;
    const invite = await InviteService.sendInvite(
      workspaceId,
      email,
      inviteRole,
      req.user.userId
    );

    // Include token in response for testing purposes (in production, this would be sent via email)
    const response: ApiResponse = {
      success: true,
      data: {
        ...invite.toResponse(),
        token: invite.token, // Include token for testing
      },
      message: 'Invite sent successfully',
    };
    res.status(201).json(response);
  } catch (error) {
    logger.error('Invite sending failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      workspaceId: req.params.workspaceId,
      userId: req.user?.userId,
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send invite',
    };
    res.status(400).json(response);
  }
};

export const acceptInvite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      res.status(401).json(response);
      return;
    }

    const { token } = req.body;

    if (!token) {
      const response: ApiResponse = {
        success: false,
        error: 'Invite token is required',
      };
      res.status(400).json(response);
      return;
    }

    const member = await InviteService.acceptInvite(token, req.user.userId);

    const response: ApiResponse = {
      success: true,
      data: member.toResponse(),
      message: 'Invite accepted successfully',
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Invite acceptance failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to accept invite',
    };
    res.status(400).json(response);
  }
};

export const declineInvite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      res.status(401).json(response);
      return;
    }

    const { token } = req.body;

    if (!token) {
      const response: ApiResponse = {
        success: false,
        error: 'Invite token is required',
      };
      res.status(400).json(response);
      return;
    }

    await InviteService.declineInvite(token, req.user.userId);

    const response: ApiResponse = {
      success: true,
      message: 'Invite declined successfully',
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Invite decline failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to decline invite',
    };
    res.status(400).json(response);
  }
};

export const getWorkspaceInvites = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const invites = await InviteService.getInvitesByWorkspace(workspaceId, req.user.userId);

    const response: ApiResponse = {
      success: true,
      data: invites.map((invite) => ({
        ...invite.toResponse(),
        token: invite.token, // Include token for testing purposes
      })),
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to fetch invites', {
      error: error instanceof Error ? error.message : 'Unknown error',
      workspaceId: req.params.workspaceId,
      userId: req.user?.userId,
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invites',
    };
    res.status(403).json(response);
  }
};

export const cancelInvite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      res.status(401).json(response);
      return;
    }

    const { workspaceId, inviteId } = req.params;
    await InviteService.cancelInvite(inviteId, workspaceId, req.user.userId);

    const response: ApiResponse = {
      success: true,
      message: 'Invite cancelled successfully',
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Invite cancellation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      inviteId: req.params.inviteId,
      workspaceId: req.params.workspaceId,
      userId: req.user?.userId,
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel invite',
    };
    const statusCode = error instanceof Error && error.message === 'Access denied' ? 403 : 400;
    res.status(statusCode).json(response);
  }
};

