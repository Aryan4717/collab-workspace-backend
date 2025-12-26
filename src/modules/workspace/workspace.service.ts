import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database';
import {
  Workspace,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceResponse,
} from '../../shared/entities/workspace.entity';
import { User } from '../../shared/entities/user.entity';
import logger from '../../shared/utils/logger';

export class WorkspaceService {
  private static workspaceRepository: Repository<Workspace> =
    AppDataSource.getRepository(Workspace);
  private static userRepository: Repository<User> = AppDataSource.getRepository(User);

  static async create(
    workspaceData: CreateWorkspaceDto,
    ownerId: string
  ): Promise<WorkspaceResponse> {
    logger.info('Creating workspace', { name: workspaceData.name, ownerId });

    // Verify owner exists
    const owner = await this.userRepository.findOne({ where: { id: ownerId } });
    if (!owner) {
      logger.warn('Workspace creation failed: Owner not found', { ownerId });
      throw new Error('Owner not found');
    }

    // Check if workspace with same name already exists for this owner
    const existingWorkspace = await this.workspaceRepository.findOne({
      where: { name: workspaceData.name, ownerId },
    });
    if (existingWorkspace) {
      logger.warn('Workspace creation failed: Workspace already exists', {
        name: workspaceData.name,
        ownerId,
      });
      throw new Error('Workspace with this name already exists');
    }

    const workspace = this.workspaceRepository.create({
      ...workspaceData,
      ownerId,
    });

    const savedWorkspace = await this.workspaceRepository.save(workspace);
    logger.info('Workspace created successfully', {
      workspaceId: savedWorkspace.id,
      name: savedWorkspace.name,
    });

    return savedWorkspace.toResponse();
  }

  static async findAll(ownerId: string): Promise<WorkspaceResponse[]> {
    logger.debug('Fetching all workspaces for owner', { ownerId });

    const workspaces = await this.workspaceRepository.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });

    return workspaces.map((workspace) => workspace.toResponse());
  }

  static async findOne(id: string, ownerId: string): Promise<WorkspaceResponse> {
    logger.debug('Fetching workspace', { workspaceId: id, ownerId });

    const workspace = await this.workspaceRepository.findOne({
      where: { id, ownerId },
      relations: ['projects'],
    });

    if (!workspace) {
      logger.warn('Workspace not found', { workspaceId: id, ownerId });
      throw new Error('Workspace not found');
    }

    return workspace.toResponse();
  }

  static async update(
    id: string,
    updateData: UpdateWorkspaceDto,
    ownerId: string
  ): Promise<WorkspaceResponse> {
    logger.info('Updating workspace', { workspaceId: id, ownerId });

    const workspace = await this.workspaceRepository.findOne({
      where: { id, ownerId },
    });

    if (!workspace) {
      logger.warn('Workspace update failed: Workspace not found', {
        workspaceId: id,
        ownerId,
      });
      throw new Error('Workspace not found');
    }

    // Check if new name conflicts with existing workspace
    if (updateData.name && updateData.name !== workspace.name) {
      const existingWorkspace = await this.workspaceRepository.findOne({
        where: { name: updateData.name, ownerId },
      });
      if (existingWorkspace) {
        logger.warn('Workspace update failed: Name already exists', {
          workspaceId: id,
          name: updateData.name,
        });
        throw new Error('Workspace with this name already exists');
      }
    }

    Object.assign(workspace, updateData);
    const updatedWorkspace = await this.workspaceRepository.save(workspace);

    logger.info('Workspace updated successfully', {
      workspaceId: updatedWorkspace.id,
    });

    return updatedWorkspace.toResponse();
  }

  static async delete(id: string, ownerId: string): Promise<void> {
    logger.info('Deleting workspace', { workspaceId: id, ownerId });

    const workspace = await this.workspaceRepository.findOne({
      where: { id, ownerId },
    });

    if (!workspace) {
      logger.warn('Workspace deletion failed: Workspace not found', {
        workspaceId: id,
        ownerId,
      });
      throw new Error('Workspace not found');
    }

    await this.workspaceRepository.remove(workspace);
    logger.info('Workspace deleted successfully', { workspaceId: id });
  }

  static async verifyOwnership(workspaceId: string, userId: string): Promise<boolean> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId, ownerId: userId },
    });
    return !!workspace;
  }
}

