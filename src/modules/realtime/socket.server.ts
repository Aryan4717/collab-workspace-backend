import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import {
  AuthenticatedSocket,
  socketAuthMiddleware,
} from '../../shared/middleware/socketAuth.middleware';
import { getRedisSubscriber, getRedisPublisher } from '../../config/redis';
import logger from '../../shared/utils/logger';

interface RoomUser {
  userId: string;
  email: string;
  socketId: string;
  joinedAt: Date;
}

interface FileChangeEvent {
  workspaceId: string;
  projectId?: string;
  fileId: string;
  fileName: string;
  changeType: 'create' | 'update' | 'delete';
  userId: string;
  userEmail: string;
  timestamp: Date;
  content?: string;
}

class SocketService {
  private io: SocketServer | null = null;
  private roomUsers: Map<string, Map<string, RoomUser>> = new Map(); // workspaceId -> userId -> RoomUser
  private redisSubscriber: ReturnType<typeof getRedisSubscriber> | null = null;
  private redisPublisher: ReturnType<typeof getRedisPublisher> | null = null;

  initialize(httpServer: HttpServer): void {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: '*', // Configure appropriately for production
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Apply authentication middleware
    this.io.use(socketAuthMiddleware);

    // Initialize Redis Pub/Sub
    this.initializeRedis();

    // Handle connections
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    logger.info('WebSocket server initialized');
  }

  private initializeRedis(): void {
    try {
      this.redisSubscriber = getRedisSubscriber();
      this.redisPublisher = getRedisPublisher();

      // Subscribe to workspace events
      this.redisSubscriber.subscribe('workspace:events', err => {
        if (err) {
          logger.error('Redis subscription error', { error: err.message });
        } else {
          logger.info('Subscribed to Redis channel: workspace:events');
        }
      });

      // Handle messages from Redis
      this.redisSubscriber.on('message', (channel, message) => {
        if (channel === 'workspace:events') {
          try {
            const event = JSON.parse(message);
            this.handleRedisEvent(event);
          } catch (error) {
            logger.error('Error parsing Redis message', {
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      });
    } catch (error) {
      logger.error('Redis initialization error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private handleRedisEvent(event: {
    type: string;
    workspaceId: string;
    data: unknown;
  }): void {
    if (!this.io) return;

    const { type, workspaceId, data } = event;

    // Broadcast to all clients in the workspace room
    this.io.to(`workspace:${workspaceId}`).emit(type, data);
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    logger.info('Client connected', {
      socketId: socket.id,
      userId: socket.userId,
      email: socket.userEmail,
    });

    // Handle workspace join
    socket.on('workspace:join', (data: { workspaceId: string }) => {
      this.handleWorkspaceJoin(socket, data.workspaceId);
    });

    // Handle workspace leave
    socket.on('workspace:leave', (data: { workspaceId: string }) => {
      this.handleWorkspaceLeave(socket, data.workspaceId);
    });

    // Handle file change events (mock)
    socket.on('file:change', (data: FileChangeEvent) => {
      this.handleFileChange(socket, data);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }

  private handleWorkspaceJoin(
    socket: AuthenticatedSocket,
    workspaceId: string
  ): void {
    if (!socket.userId || !socket.userEmail) {
      logger.warn('Workspace join failed: User not authenticated', {
        socketId: socket.id,
        workspaceId,
      });
      return;
    }

    // Join the workspace room
    socket.join(`workspace:${workspaceId}`);

    // Track user in room
    if (!this.roomUsers.has(workspaceId)) {
      this.roomUsers.set(workspaceId, new Map());
    }

    const roomUsersMap = this.roomUsers.get(workspaceId)!;
    roomUsersMap.set(socket.userId, {
      userId: socket.userId,
      email: socket.userEmail,
      socketId: socket.id,
      joinedAt: new Date(),
    });

    logger.info('User joined workspace', {
      socketId: socket.id,
      userId: socket.userId,
      workspaceId,
      totalUsers: roomUsersMap.size,
    });

    // Emit user joined event to all clients in the workspace
    const userJoinedEvent = {
      workspaceId,
      user: {
        userId: socket.userId,
        email: socket.userEmail,
      },
      timestamp: new Date(),
      totalUsers: roomUsersMap.size,
    };

    // Emit locally
    socket.to(`workspace:${workspaceId}`).emit('user:joined', userJoinedEvent);

    // Publish to Redis for multi-server support
    if (this.redisPublisher) {
      this.redisPublisher.publish(
        'workspace:events',
        JSON.stringify({
          type: 'user:joined',
          workspaceId,
          data: userJoinedEvent,
        })
      );
    }

    // Send current users list to the newly joined user
    const currentUsers = Array.from(roomUsersMap.values()).map(u => ({
      userId: u.userId,
      email: u.email,
      joinedAt: u.joinedAt,
    }));

    socket.emit('workspace:users', {
      workspaceId,
      users: currentUsers,
    });
  }

  private handleWorkspaceLeave(
    socket: AuthenticatedSocket,
    workspaceId: string
  ): void {
    if (!socket.userId) {
      return;
    }

    // Leave the workspace room
    socket.leave(`workspace:${workspaceId}`);

    // Remove user from tracking
    const roomUsersMap = this.roomUsers.get(workspaceId);
    if (roomUsersMap) {
      roomUsersMap.delete(socket.userId);

      logger.info('User left workspace', {
        socketId: socket.id,
        userId: socket.userId,
        workspaceId,
        totalUsers: roomUsersMap.size,
      });

      // Emit user left event to all clients in the workspace
      const userLeftEvent = {
        workspaceId,
        user: {
          userId: socket.userId,
          email: socket.userEmail,
        },
        timestamp: new Date(),
        totalUsers: roomUsersMap.size,
      };

      // Emit locally
      socket.to(`workspace:${workspaceId}`).emit('user:left', userLeftEvent);

      // Publish to Redis for multi-server support
      if (this.redisPublisher) {
        this.redisPublisher.publish(
          'workspace:events',
          JSON.stringify({
            type: 'user:left',
            workspaceId,
            data: userLeftEvent,
          })
        );
      }

      // Clean up empty rooms
      if (roomUsersMap.size === 0) {
        this.roomUsers.delete(workspaceId);
      }
    }
  }

  private handleFileChange(
    socket: AuthenticatedSocket,
    data: FileChangeEvent
  ): void {
    if (!socket.userId || !socket.userEmail) {
      logger.warn('File change event rejected: User not authenticated', {
        socketId: socket.id,
      });
      return;
    }

    // Validate workspace access (in production, add proper permission checks)
    const workspaceId = data.workspaceId;

    const fileChangeEvent: FileChangeEvent = {
      ...data,
      userId: socket.userId,
      userEmail: socket.userEmail,
      timestamp: new Date(),
    };

    logger.info('File change event', {
      socketId: socket.id,
      userId: socket.userId,
      workspaceId,
      fileId: data.fileId,
      changeType: data.changeType,
    });

    // Emit to all clients in the workspace (except sender)
    socket.to(`workspace:${workspaceId}`).emit('file:changed', fileChangeEvent);

    // Publish to Redis for multi-server support
    if (this.redisPublisher) {
      this.redisPublisher.publish(
        'workspace:events',
        JSON.stringify({
          type: 'file:changed',
          workspaceId,
          data: fileChangeEvent,
        })
      );
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket): void {
    logger.info('Client disconnected', {
      socketId: socket.id,
      userId: socket.userId,
    });

    // Remove user from all rooms
    for (const [workspaceId, roomUsersMap] of this.roomUsers.entries()) {
      if (socket.userId && roomUsersMap.has(socket.userId)) {
        this.handleWorkspaceLeave(socket, workspaceId);
      }
    }
  }

  getIO(): SocketServer | null {
    return this.io;
  }

  close(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    if (this.redisSubscriber) {
      this.redisSubscriber.quit();
      this.redisSubscriber = null;
    }
    if (this.redisPublisher) {
      this.redisPublisher.quit();
      this.redisPublisher = null;
    }
    logger.info('WebSocket server closed');
  }
}

export const socketService = new SocketService();
