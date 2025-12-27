export enum WorkspaceRole {
  OWNER = 'owner',
  COLLABORATOR = 'collaborator',
  VIEWER = 'viewer',
}

export interface RolePermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canManageRoles: boolean;
}

export const ROLE_PERMISSIONS: Record<WorkspaceRole, RolePermissions> = {
  [WorkspaceRole.OWNER]: {
    canView: true,
    canEdit: true,
    canDelete: true,
    canInvite: true,
    canManageRoles: true,
  },
  [WorkspaceRole.COLLABORATOR]: {
    canView: true,
    canEdit: true,
    canDelete: false,
    canInvite: true,
    canManageRoles: false,
  },
  [WorkspaceRole.VIEWER]: {
    canView: true,
    canEdit: false,
    canDelete: false,
    canInvite: false,
    canManageRoles: false,
  },
};
