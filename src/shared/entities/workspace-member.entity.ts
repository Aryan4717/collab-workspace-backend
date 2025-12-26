import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';
import { WorkspaceRole } from '../types/roles';

@Entity('workspace_members')
@Index(['workspaceId', 'userId'], { unique: true })
export class WorkspaceMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  workspaceId!: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace!: Workspace;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({
    type: 'enum',
    enum: WorkspaceRole,
    default: WorkspaceRole.VIEWER,
  })
  role!: WorkspaceRole;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  toResponse() {
    return {
      id: this.id,
      workspaceId: this.workspaceId,
      userId: this.userId,
      role: this.role,
      user: this.user ? this.user.toResponse() : undefined,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface WorkspaceMemberResponse {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

