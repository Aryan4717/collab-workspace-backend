import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { ApiResponse } from '../types';
import { RoleService } from '../../modules/role/role.service';
import { RolePermissions } from '../types/roles';

export const requireWorkspaceAccess = (
  permission: keyof RolePermissions
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const workspaceId = req.params.workspaceId || req.params.id || req.body.workspaceId;

      if (!workspaceId) {
        const response: ApiResponse = {
          success: false,
          error: 'Workspace ID is required',
        };
        res.status(400).json(response);
        return;
      }

      const hasPermission = await RoleService.hasPermission(
        workspaceId,
        req.user.userId,
        permission
      );

      if (!hasPermission) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied. Insufficient permissions.',
        };
        res.status(403).json(response);
        return;
      }

      next();
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Access check failed',
      };
      res.status(500).json(response);
    }
  };
};

export const requireWorkspaceRole = (allowedRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const workspaceId = req.params.workspaceId || req.params.id || req.body.workspaceId;

      if (!workspaceId) {
        const response: ApiResponse = {
          success: false,
          error: 'Workspace ID is required',
        };
        res.status(400).json(response);
        return;
      }

      const role = await RoleService.getMemberRole(workspaceId, req.user.userId);

      if (!role || !allowedRoles.includes(role)) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied. Insufficient role permissions.',
        };
        res.status(403).json(response);
        return;
      }

      next();
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Access check failed',
      };
      res.status(500).json(response);
    }
  };
};

