import { Repository, ObjectLiteral } from 'typeorm';
import { User } from '../../shared/entities/user.entity';
import { Workspace } from '../../shared/entities/workspace.entity';
import { Project } from '../../shared/entities/project.entity';
import { WorkspaceMember } from '../../shared/entities/workspace-member.entity';
import { RefreshToken } from '../../shared/entities/refresh-token.entity';
import { WorkspaceRole } from '../../shared/types/roles';

export const createMockUser = (overrides?: Partial<User>): User => {
  const user = new User();
  user.id = overrides?.id || 'user-123';
  user.email = overrides?.email || 'test@example.com';
  user.name = overrides?.name || 'Test User';
  user.password = overrides?.password || 'hashed-password';
  user.createdAt = overrides?.createdAt || new Date();
  user.updatedAt = overrides?.updatedAt || new Date();
  return user;
};

export const createMockWorkspace = (
  overrides?: Partial<Workspace>
): Workspace => {
  const workspace = new Workspace();
  workspace.id = overrides?.id || 'workspace-123';
  workspace.name = overrides?.name || 'Test Workspace';
  workspace.description = overrides?.description || 'Test Description';
  workspace.ownerId = overrides?.ownerId || 'user-123';
  workspace.createdAt = overrides?.createdAt || new Date();
  workspace.updatedAt = overrides?.updatedAt || new Date();
  workspace.projects = overrides?.projects || [];
  workspace.toResponse = jest.fn(() => ({
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    ownerId: workspace.ownerId,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  }));
  return workspace;
};

export const createMockProject = (overrides?: Partial<Project>): Project => {
  const project = new Project();
  project.id = overrides?.id || 'project-123';
  project.name = overrides?.name || 'Test Project';
  project.description = overrides?.description || 'Test Description';
  project.workspaceId = overrides?.workspaceId || 'workspace-123';
  project.createdAt = overrides?.createdAt || new Date();
  project.updatedAt = overrides?.updatedAt || new Date();
  project.toResponse = jest.fn(() => ({
    id: project.id,
    name: project.name,
    description: project.description,
    workspaceId: project.workspaceId,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }));
  return project;
};

export const createMockWorkspaceMember = (
  overrides?: Partial<WorkspaceMember>
): WorkspaceMember => {
  const member = new WorkspaceMember();
  member.id = overrides?.id || 'member-123';
  member.workspaceId = overrides?.workspaceId || 'workspace-123';
  member.userId = overrides?.userId || 'user-123';
  member.role = overrides?.role || WorkspaceRole.COLLABORATOR;
  member.createdAt = overrides?.createdAt || new Date();
  member.updatedAt = overrides?.updatedAt || new Date();
  return member;
};

export const createMockRepository = <T extends ObjectLiteral>(): jest.Mocked<
  Repository<T>
> => {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  } as unknown as jest.Mocked<Repository<T>>;
};

export const createMockRefreshToken = (
  overrides?: Partial<RefreshToken>
): RefreshToken => {
  const token = new RefreshToken();
  token.id = overrides?.id || 'token-123';
  token.token = overrides?.token || 'refresh-token-123';
  token.userId = overrides?.userId || 'user-123';
  token.expiresAt =
    overrides?.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  token.createdAt = overrides?.createdAt || new Date();
  return token;
};
