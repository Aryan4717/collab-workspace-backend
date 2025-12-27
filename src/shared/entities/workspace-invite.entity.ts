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

export enum InviteStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
}

@Entity('workspace_invites')
@Index(['workspaceId', 'email'], { unique: true })
@Index(['token'], { unique: true })
@Index(['workspaceId'])
@Index(['email'])
@Index(['status'])
export class WorkspaceInvite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  workspaceId!: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace!: Workspace;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({
    type: 'enum',
    enum: WorkspaceRole,
    default: WorkspaceRole.VIEWER,
  })
  role!: WorkspaceRole;

  @Column({ type: 'uuid' })
  invitedById!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invitedById' })
  invitedBy!: User;

  @Column({ type: 'varchar', length: 255, unique: true })
  token!: string;

  @Column({
    type: 'enum',
    enum: InviteStatus,
    default: InviteStatus.PENDING,
  })
  status!: InviteStatus;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  toResponse() {
    return {
      id: this.id,
      workspaceId: this.workspaceId,
      email: this.email,
      role: this.role,
      invitedById: this.invitedById,
      status: this.status,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface WorkspaceInviteResponse {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedById: string;
  status: InviteStatus;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

