// Mock dependencies BEFORE importing the service
jest.mock('../../../config/database');
jest.mock('../../role/role.service');
jest.mock('../../../shared/utils/cache.util');
jest.mock('../../../shared/utils/logger');

import { WorkspaceService } from '../workspace.service';
import { AppDataSource } from '../../../config/database';
import { Workspace } from '../../../shared/entities/workspace.entity';
import { User } from '../../../shared/entities/user.entity';
import { RoleService } from '../../role/role.service';
import { CacheService } from '../../../shared/utils/cache.util';
import {
  createMockUser,
  createMockWorkspace,
  createMockRepository,
} from '../../../__tests__/helpers/test-helpers';

describe('WorkspaceService', () => {
  let mockWorkspaceRepository: jest.Mocked<any>;
  let mockUserRepository: jest.Mocked<any>;

  beforeEach(() => {
    mockWorkspaceRepository = createMockRepository<Workspace>();
    mockUserRepository = createMockRepository<User>();

    (AppDataSource.getRepository as jest.Mock) = jest.fn(entity => {
      if (entity === Workspace) return mockWorkspaceRepository;
      if (entity === User) return mockUserRepository;
      return createMockRepository();
    });

    // Re-initialize the service repositories
    (WorkspaceService as any).workspaceRepository = mockWorkspaceRepository;
    (WorkspaceService as any).userRepository = mockUserRepository;

    // Mock CacheService
    (CacheService.get as jest.Mock) = jest.fn().mockResolvedValue(null);
    (CacheService.set as jest.Mock) = jest.fn();
    (CacheService.invalidateWorkspace as jest.Mock) = jest.fn();
    (CacheService.invalidateUser as jest.Mock) = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create workspace successfully', async () => {
      const workspaceData = {
        name: 'New Workspace',
        description: 'Test Description',
      };
      const ownerId = 'user-123';
      const mockOwner = createMockUser({ id: ownerId });
      const mockWorkspace = createMockWorkspace({ ...workspaceData, ownerId });

      mockUserRepository.findOne.mockResolvedValue(mockOwner);
      mockWorkspaceRepository.findOne.mockResolvedValue(null);
      mockWorkspaceRepository.create.mockReturnValue(mockWorkspace);
      mockWorkspaceRepository.save.mockResolvedValue(mockWorkspace);

      // Mock WorkspaceMember creation
      const { WorkspaceMember } =
        await import('../../../shared/entities/workspace-member.entity');
      const mockMemberRepository = createMockRepository();
      (AppDataSource.getRepository as jest.Mock).mockImplementation(entity => {
        if (entity === WorkspaceMember) return mockMemberRepository;
        if (entity === Workspace) return mockWorkspaceRepository;
        if (entity === User) return mockUserRepository;
        return createMockRepository();
      });
      mockMemberRepository.create.mockReturnValue({});
      mockMemberRepository.save.mockResolvedValue({});

      const result = await WorkspaceService.create(workspaceData, ownerId);

      expect(result).toBeDefined();
      expect(result.name).toBe(workspaceData.name);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: ownerId },
      });
      expect(mockWorkspaceRepository.save).toHaveBeenCalled();
    });

    it('should throw error if owner not found', async () => {
      const workspaceData = { name: 'New Workspace' };
      const ownerId = 'nonexistent-user';

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        WorkspaceService.create(workspaceData, ownerId)
      ).rejects.toThrow('Owner not found');
    });

    it('should throw error if workspace name already exists', async () => {
      const workspaceData = { name: 'Existing Workspace' };
      const ownerId = 'user-123';
      const mockOwner = createMockUser({ id: ownerId });
      const existingWorkspace = createMockWorkspace({
        name: workspaceData.name,
        ownerId,
      });

      mockUserRepository.findOne.mockResolvedValue(mockOwner);
      mockWorkspaceRepository.findOne.mockResolvedValue(existingWorkspace);

      await expect(
        WorkspaceService.create(workspaceData, ownerId)
      ).rejects.toThrow('Workspace with this name already exists');
    });
  });

  describe('findOne', () => {
    it('should return workspace from cache if available', async () => {
      const workspaceId = 'workspace-123';
      const userId = 'user-123';
      const cachedWorkspace = {
        id: workspaceId,
        name: 'Cached Workspace',
        ownerId: userId,
      };

      (CacheService.get as jest.Mock).mockResolvedValue(cachedWorkspace);
      (RoleService.getMemberRole as jest.Mock).mockResolvedValue('OWNER');

      const result = await WorkspaceService.findOne(workspaceId, userId);

      expect(result).toEqual(cachedWorkspace);
      expect(mockWorkspaceRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from database if not cached', async () => {
      const workspaceId = 'workspace-123';
      const userId = 'user-123';
      const mockWorkspace = createMockWorkspace({
        id: workspaceId,
        ownerId: userId,
      });

      (CacheService.get as jest.Mock).mockResolvedValue(null);
      mockWorkspaceRepository.findOne.mockResolvedValue(mockWorkspace);
      (RoleService.getMemberRole as jest.Mock).mockResolvedValue('OWNER');
      (CacheService.set as jest.Mock).mockResolvedValue(undefined);

      const result = await WorkspaceService.findOne(workspaceId, userId);

      expect(result).toBeDefined();
      expect(mockWorkspaceRepository.findOne).toHaveBeenCalled();
      expect(CacheService.set).toHaveBeenCalled();
    });

    it('should throw error if workspace not found', async () => {
      const workspaceId = 'nonexistent-workspace';
      const userId = 'user-123';

      (CacheService.get as jest.Mock).mockResolvedValue(null);
      mockWorkspaceRepository.findOne.mockResolvedValue(null);

      await expect(
        WorkspaceService.findOne(workspaceId, userId)
      ).rejects.toThrow('Workspace not found');
    });

    it('should throw error if user has no access', async () => {
      const workspaceId = 'workspace-123';
      const userId = 'unauthorized-user';
      const mockWorkspace = createMockWorkspace({
        id: workspaceId,
        ownerId: 'other-user',
      });

      (CacheService.get as jest.Mock).mockResolvedValue(null);
      mockWorkspaceRepository.findOne.mockResolvedValue(mockWorkspace);
      (RoleService.getMemberRole as jest.Mock).mockResolvedValue(null);

      await expect(
        WorkspaceService.findOne(workspaceId, userId)
      ).rejects.toThrow('Access denied');
    });
  });

  describe('update', () => {
    it('should update workspace successfully', async () => {
      const workspaceId = 'workspace-123';
      const userId = 'user-123';
      const updateData = { description: 'Updated Description' };
      const mockWorkspace = createMockWorkspace({
        id: workspaceId,
        ownerId: userId,
      });

      mockWorkspaceRepository.findOne.mockResolvedValue(mockWorkspace);
      (RoleService.hasPermission as jest.Mock).mockResolvedValue(true);
      mockWorkspaceRepository.save.mockResolvedValue({
        ...mockWorkspace,
        ...updateData,
      });

      const result = await WorkspaceService.update(
        workspaceId,
        updateData,
        userId
      );

      expect(result).toBeDefined();
      expect(mockWorkspaceRepository.save).toHaveBeenCalled();
      expect(CacheService.invalidateWorkspace).toHaveBeenCalledWith(
        workspaceId
      );
    });

    it('should throw error if user lacks permission', async () => {
      const workspaceId = 'workspace-123';
      const userId = 'unauthorized-user';
      const updateData = { description: 'Updated Description' };
      const mockWorkspace = createMockWorkspace({ id: workspaceId });

      mockWorkspaceRepository.findOne.mockResolvedValue(mockWorkspace);
      (RoleService.hasPermission as jest.Mock).mockResolvedValue(false);

      await expect(
        WorkspaceService.update(workspaceId, updateData, userId)
      ).rejects.toThrow('Access denied');
    });
  });

  describe('delete', () => {
    it('should delete workspace successfully', async () => {
      const workspaceId = 'workspace-123';
      const userId = 'user-123';
      const mockWorkspace = createMockWorkspace({
        id: workspaceId,
        ownerId: userId,
      });

      mockWorkspaceRepository.findOne.mockResolvedValue(mockWorkspace);
      mockWorkspaceRepository.remove.mockResolvedValue(mockWorkspace);

      await WorkspaceService.delete(workspaceId, userId);

      expect(mockWorkspaceRepository.remove).toHaveBeenCalled();
      expect(CacheService.invalidateWorkspace).toHaveBeenCalledWith(
        workspaceId
      );
    });

    it('should throw error if user is not owner', async () => {
      const workspaceId = 'workspace-123';
      const userId = 'non-owner';
      const mockWorkspace = createMockWorkspace({
        id: workspaceId,
        ownerId: 'other-user',
      });

      mockWorkspaceRepository.findOne.mockResolvedValue(mockWorkspace);

      await expect(
        WorkspaceService.delete(workspaceId, userId)
      ).rejects.toThrow('Only workspace owner can delete the workspace');
    });
  });
});
