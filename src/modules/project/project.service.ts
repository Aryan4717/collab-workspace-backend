import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database';
import {
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectResponse,
} from '../../shared/entities/project.entity';
import { Workspace } from '../../shared/entities/workspace.entity';
import logger from '../../shared/utils/logger';

export class ProjectService {
  private static projectRepository: Repository<Project> =
    AppDataSource.getRepository(Project);
  private static workspaceRepository: Repository<Workspace> =
    AppDataSource.getRepository(Workspace);

  static async create(
    projectData: CreateProjectDto,
    ownerId: string
  ): Promise<ProjectResponse> {
    logger.info('Creating project', {
      name: projectData.name,
      workspaceId: projectData.workspaceId,
    });

    // Verify workspace exists and user owns it
    const workspace = await this.workspaceRepository.findOne({
      where: { id: projectData.workspaceId, ownerId },
    });

    if (!workspace) {
      logger.warn('Project creation failed: Workspace not found or access denied', {
        workspaceId: projectData.workspaceId,
        ownerId,
      });
      throw new Error('Workspace not found or access denied');
    }

    // Check if project with same name already exists in this workspace
    const existingProject = await this.projectRepository.findOne({
      where: { name: projectData.name, workspaceId: projectData.workspaceId },
    });
    if (existingProject) {
      logger.warn('Project creation failed: Project already exists', {
        name: projectData.name,
        workspaceId: projectData.workspaceId,
      });
      throw new Error('Project with this name already exists in this workspace');
    }

    const project = this.projectRepository.create({
      name: projectData.name,
      description: projectData.description,
      workspaceId: projectData.workspaceId,
    });

    const savedProject = await this.projectRepository.save(project);
    logger.info('Project created successfully', {
      projectId: savedProject.id,
      name: savedProject.name,
    });

    return savedProject.toResponse();
  }

  static async findAll(workspaceId: string, ownerId: string): Promise<ProjectResponse[]> {
    logger.debug('Fetching all projects for workspace', { workspaceId, ownerId });

    // Verify workspace ownership
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId, ownerId },
    });

    if (!workspace) {
      logger.warn('Project fetch failed: Workspace not found or access denied', {
        workspaceId,
        ownerId,
      });
      throw new Error('Workspace not found or access denied');
    }

    const projects = await this.projectRepository.find({
      where: { workspaceId },
      order: { createdAt: 'DESC' },
    });

    return projects.map((project) => project.toResponse());
  }

  static async findOne(
    id: string,
    workspaceId: string,
    ownerId: string
  ): Promise<ProjectResponse> {
    logger.debug('Fetching project', { projectId: id, workspaceId, ownerId });

    // Verify workspace ownership
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId, ownerId },
    });

    if (!workspace) {
      logger.warn('Project fetch failed: Workspace not found or access denied', {
        workspaceId,
        ownerId,
      });
      throw new Error('Workspace not found or access denied');
    }

    const project = await this.projectRepository.findOne({
      where: { id, workspaceId },
    });

    if (!project) {
      logger.warn('Project not found', { projectId: id, workspaceId });
      throw new Error('Project not found');
    }

    return project.toResponse();
  }

  static async update(
    id: string,
    updateData: UpdateProjectDto,
    workspaceId: string,
    ownerId: string
  ): Promise<ProjectResponse> {
    logger.info('Updating project', { projectId: id, workspaceId, ownerId });

    // Verify workspace ownership
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId, ownerId },
    });

    if (!workspace) {
      logger.warn('Project update failed: Workspace not found or access denied', {
        workspaceId,
        ownerId,
      });
      throw new Error('Workspace not found or access denied');
    }

    const project = await this.projectRepository.findOne({
      where: { id, workspaceId },
    });

    if (!project) {
      logger.warn('Project update failed: Project not found', {
        projectId: id,
        workspaceId,
      });
      throw new Error('Project not found');
    }

    // Check if new name conflicts with existing project in the same workspace
    if (updateData.name && updateData.name !== project.name) {
      const existingProject = await this.projectRepository.findOne({
        where: { name: updateData.name, workspaceId },
      });
      if (existingProject) {
        logger.warn('Project update failed: Name already exists', {
          projectId: id,
          name: updateData.name,
        });
        throw new Error('Project with this name already exists in this workspace');
      }
    }

    Object.assign(project, updateData);
    const updatedProject = await this.projectRepository.save(project);

    logger.info('Project updated successfully', {
      projectId: updatedProject.id,
    });

    return updatedProject.toResponse();
  }

  static async delete(
    id: string,
    workspaceId: string,
    ownerId: string
  ): Promise<void> {
    logger.info('Deleting project', { projectId: id, workspaceId, ownerId });

    // Verify workspace ownership
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId, ownerId },
    });

    if (!workspace) {
      logger.warn('Project deletion failed: Workspace not found or access denied', {
        workspaceId,
        ownerId,
      });
      throw new Error('Workspace not found or access denied');
    }

    const project = await this.projectRepository.findOne({
      where: { id, workspaceId },
    });

    if (!project) {
      logger.warn('Project deletion failed: Project not found', {
        projectId: id,
        workspaceId,
      });
      throw new Error('Project not found');
    }

    await this.projectRepository.remove(project);
    logger.info('Project deleted successfully', { projectId: id });
  }
}

