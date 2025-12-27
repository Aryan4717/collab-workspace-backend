// Mock dependencies BEFORE importing the service
jest.mock('../../../config/database');
jest.mock('../../role/role.service');
jest.mock('../../../shared/utils/cache.util');
jest.mock('../../../shared/utils/logger');

import { ProjectService } from '../project.service';
import { AppDataSource } from '../../../config/database';
import { Project } from '../../../shared/entities/project.entity';
import { Workspace } from '../../../shared/entities/workspace.entity';
import { RoleService } from '../../role/role.service';
import { CacheService } from '../../../shared/utils/cache.util';
import {
  createMockProject,
  createMockWorkspace,
  createMockRepository,
} from '../../../__tests__/helpers/test-helpers';

describe('ProjectService', () => {
  let mockProjectRepository: jest.Mocked<any>;
  let mockWorkspaceRepository: jest.Mocked<any>;

  beforeEach(() => {
    mockProjectRepository = createMockRepository<Project>();
    mockWorkspaceRepository = createMockRepository<Workspace>();

    (AppDataSource.getRepository as jest.Mock) = jest.fn(entity => {
      if (entity === Project) return mockProjectRepository;
      if (entity === Workspace) return mockWorkspaceRepository;
      return createMockRepository();
    });

    // Re-initialize the service repositories
    (ProjectService as any).projectRepository = mockProjectRepository;
    (ProjectService as any).workspaceRepository = mockWorkspaceRepository;

    // Mock CacheService
    (CacheService.get as jest.Mock) = jest.fn().mockResolvedValue(null);
    (CacheService.set as jest.Mock) = jest.fn();
    (CacheService.invalidateProject as jest.Mock) = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create project successfully', async () => {
      const projectData = {
        name: 'New Project',
        description: 'Test Description',
        workspaceId: 'workspace-123',
      };
      const userId = 'user-123';
      const mockWorkspace = createMockWorkspace({
        id: projectData.workspaceId,
      });
      const mockProject = createMockProject(projectData);

      mockWorkspaceRepository.findOne.mockResolvedValue(mockWorkspace);
      (RoleService.hasPermission as jest.Mock).mockResolvedValue(true);
      mockProjectRepository.findOne.mockResolvedValue(null);
      mockProjectRepository.create.mockReturnValue(mockProject);
      mockProjectRepository.save.mockResolvedValue(mockProject);

      const result = await ProjectService.create(projectData, userId);

      expect(result).toBeDefined();
      expect(result.name).toBe(projectData.name);
      expect(mockProjectRepository.save).toHaveBeenCalled();
      expect(CacheService.invalidateProject).toHaveBeenCalled();
    });

    it('should throw error if workspace not found', async () => {
      const projectData = {
        name: 'New Project',
        workspaceId: 'nonexistent-workspace',
      };
      const userId = 'user-123';

      mockWorkspaceRepository.findOne.mockResolvedValue(null);

      await expect(ProjectService.create(projectData, userId)).rejects.toThrow(
        'Workspace not found'
      );
    });

    it('should throw error if user lacks permission', async () => {
      const projectData = {
        name: 'New Project',
        workspaceId: 'workspace-123',
      };
      const userId = 'unauthorized-user';
      const mockWorkspace = createMockWorkspace({
        id: projectData.workspaceId,
      });

      mockWorkspaceRepository.findOne.mockResolvedValue(mockWorkspace);
      (RoleService.hasPermission as jest.Mock).mockResolvedValue(false);

      await expect(ProjectService.create(projectData, userId)).rejects.toThrow(
        'Access denied'
      );
    });

    it('should throw error if project name already exists', async () => {
      const projectData = {
        name: 'Existing Project',
        workspaceId: 'workspace-123',
      };
      const userId = 'user-123';
      const mockWorkspace = createMockWorkspace({
        id: projectData.workspaceId,
      });
      const existingProject = createMockProject(projectData);

      mockWorkspaceRepository.findOne.mockResolvedValue(mockWorkspace);
      (RoleService.hasPermission as jest.Mock).mockResolvedValue(true);
      mockProjectRepository.findOne.mockResolvedValue(existingProject);

      await expect(ProjectService.create(projectData, userId)).rejects.toThrow(
        'Project with this name already exists'
      );
    });
  });

  describe('findOne', () => {
    it('should return project from cache if available', async () => {
      const projectId = 'project-123';
      const workspaceId = 'workspace-123';
      const userId = 'user-123';
      const cachedProject = {
        id: projectId,
        name: 'Cached Project',
        workspaceId,
      };

      (CacheService.get as jest.Mock).mockResolvedValue(cachedProject);
      (RoleService.hasPermission as jest.Mock).mockResolvedValue(true);

      const result = await ProjectService.findOne(
        projectId,
        workspaceId,
        userId
      );

      expect(result).toEqual(cachedProject);
      expect(mockProjectRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from database if not cached', async () => {
      const projectId = 'project-123';
      const workspaceId = 'workspace-123';
      const userId = 'user-123';
      const mockProject = createMockProject({ id: projectId, workspaceId });
      const mockWorkspace = createMockWorkspace({ id: workspaceId });

      (CacheService.get as jest.Mock).mockResolvedValue(null);
      mockWorkspaceRepository.findOne.mockResolvedValue(mockWorkspace);
      (RoleService.hasPermission as jest.Mock).mockResolvedValue(true);
      mockProjectRepository.findOne.mockResolvedValue(mockProject);
      (CacheService.set as jest.Mock).mockResolvedValue(undefined);

      const result = await ProjectService.findOne(
        projectId,
        workspaceId,
        userId
      );

      expect(result).toBeDefined();
      expect(mockProjectRepository.findOne).toHaveBeenCalled();
      expect(CacheService.set).toHaveBeenCalled();
    });

    it('should throw error if project not found', async () => {
      const projectId = 'nonexistent-project';
      const workspaceId = 'workspace-123';
      const userId = 'user-123';
      const mockWorkspace = createMockWorkspace({ id: workspaceId });

      (CacheService.get as jest.Mock).mockResolvedValue(null);
      mockWorkspaceRepository.findOne.mockResolvedValue(mockWorkspace);
      (RoleService.hasPermission as jest.Mock).mockResolvedValue(true);
      mockProjectRepository.findOne.mockResolvedValue(null);

      await expect(
        ProjectService.findOne(projectId, workspaceId, userId)
      ).rejects.toThrow('Project not found');
    });
  });

  describe('update', () => {
    it('should update project successfully', async () => {
      const projectId = 'project-123';
      const workspaceId = 'workspace-123';
      const userId = 'user-123';
      const updateData = { description: 'Updated Description' };
      const mockProject = createMockProject({ id: projectId, workspaceId });
      const mockWorkspace = createMockWorkspace({ id: workspaceId });

      mockWorkspaceRepository.findOne.mockResolvedValue(mockWorkspace);
      (RoleService.hasPermission as jest.Mock).mockResolvedValue(true);
      mockProjectRepository.findOne.mockResolvedValue(mockProject);
      mockProjectRepository.save.mockResolvedValue({
        ...mockProject,
        ...updateData,
      });

      const result = await ProjectService.update(
        projectId,
        updateData,
        workspaceId,
        userId
      );

      expect(result).toBeDefined();
      expect(mockProjectRepository.save).toHaveBeenCalled();
      expect(CacheService.invalidateProject).toHaveBeenCalled();
    });

    it('should throw error if user lacks permission', async () => {
      const projectId = 'project-123';
      const workspaceId = 'workspace-123';
      const userId = 'unauthorized-user';
      const updateData = { description: 'Updated Description' };
      const mockWorkspace = createMockWorkspace({ id: workspaceId });

      mockWorkspaceRepository.findOne.mockResolvedValue(mockWorkspace);
      (RoleService.hasPermission as jest.Mock).mockResolvedValue(false);

      await expect(
        ProjectService.update(projectId, updateData, workspaceId, userId)
      ).rejects.toThrow('Access denied');
    });
  });

  describe('delete', () => {
    it('should delete project successfully', async () => {
      const projectId = 'project-123';
      const workspaceId = 'workspace-123';
      const userId = 'user-123';
      const mockProject = createMockProject({ id: projectId, workspaceId });
      const mockWorkspace = createMockWorkspace({ id: workspaceId });

      mockWorkspaceRepository.findOne.mockResolvedValue(mockWorkspace);
      (RoleService.hasPermission as jest.Mock).mockResolvedValue(true);
      mockProjectRepository.findOne.mockResolvedValue(mockProject);
      mockProjectRepository.remove.mockResolvedValue(mockProject);

      await ProjectService.delete(projectId, workspaceId, userId);

      expect(mockProjectRepository.remove).toHaveBeenCalled();
      expect(CacheService.invalidateProject).toHaveBeenCalled();
    });
  });
});
