import { Response } from 'express';
import { WorkspaceService } from './workspace.service';
import { ApiResponse } from '../../shared/types';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { UpdateWorkspaceDto } from '../../shared/entities/workspace.entity';
import logger from '../../shared/utils/logger';

export const createWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      res.status(401).json(response);
      return;
    }

    const { name, description } = req.body;

    if (!name) {
      const response: ApiResponse = {
        success: false,
        error: 'Workspace name is required',
      };
      res.status(400).json(response);
      return;
    }

    const workspace = await WorkspaceService.create(
      { name, description },
      req.user.userId
    );

    const response: ApiResponse = {
      success: true,
      data: workspace,
      message: 'Workspace created successfully',
    };
    res.status(201).json(response);
  } catch (error) {
    logger.error('Workspace creation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create workspace',
    };
    res.status(400).json(response);
  }
};

export const getAllWorkspaces = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      res.status(401).json(response);
      return;
    }

    const workspaces = await WorkspaceService.findAll(req.user.userId);

    const response: ApiResponse = {
      success: true,
      data: workspaces,
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to fetch workspaces', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch workspaces',
    };
    res.status(500).json(response);
  }
};

export const getWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      res.status(401).json(response);
      return;
    }

    const { id } = req.params;
    const workspace = await WorkspaceService.findOne(id, req.user.userId);

    const response: ApiResponse = {
      success: true,
      data: workspace,
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to fetch workspace', {
      error: error instanceof Error ? error.message : 'Unknown error',
      workspaceId: req.params.id,
      userId: req.user?.userId,
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch workspace',
    };
    const statusCode = error instanceof Error && error.message === 'Workspace not found' ? 404 : 500;
    res.status(statusCode).json(response);
  }
};

export const updateWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      res.status(401).json(response);
      return;
    }

    const { id } = req.params;
    const { name, description } = req.body;

    const updateData: UpdateWorkspaceDto = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const workspace = await WorkspaceService.update(id, updateData, req.user.userId);

    const response: ApiResponse = {
      success: true,
      data: workspace,
      message: 'Workspace updated successfully',
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Workspace update failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      workspaceId: req.params.id,
      userId: req.user?.userId,
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update workspace',
    };
    const statusCode = error instanceof Error && error.message === 'Workspace not found' ? 404 : 400;
    res.status(statusCode).json(response);
  }
};

export const deleteWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not authenticated',
      };
      res.status(401).json(response);
      return;
    }

    const { id } = req.params;
    await WorkspaceService.delete(id, req.user.userId);

    const response: ApiResponse = {
      success: true,
      message: 'Workspace deleted successfully',
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Workspace deletion failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      workspaceId: req.params.id,
      userId: req.user?.userId,
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete workspace',
    };
    const statusCode = error instanceof Error && error.message === 'Workspace not found' ? 404 : 500;
    res.status(statusCode).json(response);
  }
};

