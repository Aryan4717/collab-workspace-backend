import { Response } from 'express';
import { ProjectService } from './project.service';
import { ApiResponse } from '../../shared/types';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { UpdateProjectDto } from '../../shared/entities/project.entity';
import logger from '../../shared/utils/logger';

export const createProject = async (
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

    const { name, description, workspaceId } = req.body;

    if (!name || !workspaceId) {
      const response: ApiResponse = {
        success: false,
        error: 'Project name and workspace ID are required',
      };
      res.status(400).json(response);
      return;
    }

    const project = await ProjectService.create(
      { name, description, workspaceId },
      req.user.userId
    );

    const response: ApiResponse = {
      success: true,
      data: project,
      message: 'Project created successfully',
    };
    res.status(201).json(response);
  } catch (error) {
    logger.error('Project creation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
      workspaceId: req.body?.workspaceId,
    });
    const response: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create project',
    };
    const statusCode =
      error instanceof Error &&
      (error.message.includes('not found') ||
        error.message.includes('access denied'))
        ? 404
        : 400;
    res.status(statusCode).json(response);
  }
};

export const getAllProjects = async (
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

    if (!workspaceId) {
      const response: ApiResponse = {
        success: false,
        error: 'Workspace ID is required',
      };
      res.status(400).json(response);
      return;
    }

    const projects = await ProjectService.findAll(workspaceId, req.user.userId);

    const response: ApiResponse = {
      success: true,
      data: projects,
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to fetch projects', {
      error: error instanceof Error ? error.message : 'Unknown error',
      workspaceId: req.params.workspaceId,
      userId: req.user?.userId,
    });
    const response: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch projects',
    };
    const statusCode =
      error instanceof Error &&
      (error.message.includes('not found') ||
        error.message.includes('access denied'))
        ? 404
        : 500;
    res.status(statusCode).json(response);
  }
};

export const getProject = async (
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

    const { workspaceId, id } = req.params;

    if (!workspaceId) {
      const response: ApiResponse = {
        success: false,
        error: 'Workspace ID is required',
      };
      res.status(400).json(response);
      return;
    }

    const project = await ProjectService.findOne(
      id,
      workspaceId,
      req.user.userId
    );

    const response: ApiResponse = {
      success: true,
      data: project,
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to fetch project', {
      error: error instanceof Error ? error.message : 'Unknown error',
      projectId: req.params.id,
      workspaceId: req.params.workspaceId,
      userId: req.user?.userId,
    });
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch project',
    };
    const statusCode =
      error instanceof Error &&
      (error.message === 'Project not found' ||
        error.message.includes('not found') ||
        error.message.includes('access denied'))
        ? 404
        : 500;
    res.status(statusCode).json(response);
  }
};

export const updateProject = async (
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

    const { workspaceId, id } = req.params;
    const { name, description } = req.body;

    if (!workspaceId) {
      const response: ApiResponse = {
        success: false,
        error: 'Workspace ID is required',
      };
      res.status(400).json(response);
      return;
    }

    const updateData: UpdateProjectDto = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const project = await ProjectService.update(
      id,
      updateData,
      workspaceId,
      req.user.userId
    );

    const response: ApiResponse = {
      success: true,
      data: project,
      message: 'Project updated successfully',
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Project update failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      projectId: req.params.id,
      workspaceId: req.params.workspaceId,
      userId: req.user?.userId,
    });
    const response: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update project',
    };
    const statusCode =
      error instanceof Error &&
      (error.message === 'Project not found' ||
        error.message.includes('not found') ||
        error.message.includes('access denied'))
        ? 404
        : 400;
    res.status(statusCode).json(response);
  }
};

export const deleteProject = async (
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

    const { workspaceId, id } = req.params;

    if (!workspaceId) {
      const response: ApiResponse = {
        success: false,
        error: 'Workspace ID is required',
      };
      res.status(400).json(response);
      return;
    }

    await ProjectService.delete(id, workspaceId, req.user.userId);

    const response: ApiResponse = {
      success: true,
      message: 'Project deleted successfully',
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Project deletion failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      projectId: req.params.id,
      workspaceId: req.params.workspaceId,
      userId: req.user?.userId,
    });
    const response: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete project',
    };
    const statusCode =
      error instanceof Error &&
      (error.message === 'Project not found' ||
        error.message.includes('not found') ||
        error.message.includes('access denied'))
        ? 404
        : 500;
    res.status(statusCode).json(response);
  }
};
