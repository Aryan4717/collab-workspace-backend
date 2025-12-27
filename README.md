# Collaborative Workspace Backend

A scalable, real-time collaborative workspace backend API built with Node.js, TypeScript, Express, PostgreSQL, and Redis. This application provides workspace management, project collaboration, role-based access control, job queue processing, and real-time WebSocket communication.

## Table of Contents

- [Architecture](#architecture)
- [Trade-offs](#trade-offs)
- [Scalability](#scalability)
- [How to Run](#how-to-run)
- [API Documentation](#api-documentation)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)

## Architecture

### System Overview

The application follows a **modular monolith architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                       │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
        ┌──────▼──────┐              ┌───────▼──────┐
        │  HTTP API   │              │  WebSocket   │
        │  (Express)  │              │  (Socket.IO) │
        └──────┬──────┘              └───────┬──────┘
               │                              │
        ┌──────▼──────────────────────────────▼──────┐
        │         Application Layer (Modules)         │
        │  Auth │ Workspace │ Project │ Job │ Role   │
        └───────┬────────────────────────────┬───────┘
                │                            │
        ┌───────▼────────┐          ┌───────▼────────┐
        │  PostgreSQL    │          │     Redis      │
        │  (Primary DB)  │          │ (Cache/Queue)  │
        └────────────────┘          └────────────────┘
                                         │
                                ┌────────▼────────┐
                                │  Worker Service │
                                │   (BullMQ)      │
                                └─────────────────┘
```

### Component Architecture

#### 1. **API Server** (`src/server.ts`)
- Main HTTP server built on Express
- Handles REST API requests
- Initializes database, Redis, and WebSocket connections
- Supports graceful shutdown

#### 2. **Worker Service** (`src/worker.ts`)
- Separate process/container for background job processing
- Processes jobs from BullMQ queues stored in Redis
- Supports job types: email sending, file processing, data export, notifications, workspace backups
- Auto-scales based on queue depth

#### 3. **Database Layer**
- **PostgreSQL 16**: Primary database for all persistent data
- **TypeORM**: Object-Relational Mapping for type-safe database operations
- Entities: User, Workspace, Project, WorkspaceMember, WorkspaceInvite, Job, RefreshToken

#### 4. **Cache & Queue Layer**
- **Redis 7**: Used for both caching and job queue management
- **BullMQ**: Job queue system for async task processing
- **ioredis**: Redis client with connection pooling

#### 5. **Real-time Communication**
- **Socket.IO**: WebSocket server for real-time collaboration
- Redis pub/sub for multi-instance communication
- Supports workspace-level real-time events

#### 6. **Authentication & Authorization**
- **JWT-based authentication**: Access tokens (15min) + Refresh tokens (7 days)
- **RBAC (Role-Based Access Control)**: Owner, Collaborator, Viewer roles
- Permission-based middleware for fine-grained access control

### Module Structure

The application follows a **feature-based module structure**:

```
modules/
├── auth/          # Authentication & user management
├── workspace/     # Workspace CRUD operations
├── project/       # Project management within workspaces
├── invite/        # Workspace invitation system
├── role/          # Role & permission management
├── job/           # Job queue & background processing
├── realtime/      # WebSocket/real-time communication
└── health/        # Health check endpoints
```

Each module contains:
- `*.controller.ts`: Request handlers
- `*.service.ts`: Business logic
- `*.routes.ts`: Route definitions

### Data Flow

1. **API Request Flow**:
   ```
   HTTP Request → Rate Limiter → Auth Middleware → RBAC Middleware → Controller → Service → Repository → Database
   ```

2. **Job Processing Flow**:
   ```
   API Request → Job Service → Create Job Record (DB) → Add to Queue (Redis) → Worker Processes → Update Job Status (DB)
   ```

3. **Real-time Event Flow**:
   ```
   Action → Service → Redis Pub/Sub → Socket.IO → Connected Clients
   ```

## Trade-offs

### Design Decisions and Rationale

#### 1. **Modular Monolith vs. Microservices**
**Choice**: Modular Monolith
- **Pros**: 
  - Simpler deployment and debugging
  - Shared codebase and types
  - Easier to maintain consistency
  - Lower operational complexity
- **Cons**:
  - Cannot scale components independently (mitigated by separate worker service)
  - Single deployment unit
- **Rationale**: For the current scale, a modular monolith provides better developer experience and operational simplicity. The worker service separation allows for independent scaling of background jobs.

#### 2. **TypeORM vs. Prisma/Sequelize**
**Choice**: TypeORM
- **Pros**:
  - Decorator-based entity definitions (clean, declarative)
  - Active Record and Data Mapper patterns
  - Strong TypeScript support
  - Built-in migration system
- **Cons**:
  - Larger bundle size
  - Learning curve
- **Rationale**: TypeORM provides excellent TypeScript integration and allows for clean entity definitions with decorators.

#### 3. **BullMQ vs. RabbitMQ/SQS**
**Choice**: BullMQ (Redis-based)
- **Pros**:
  - Simple setup (uses existing Redis infrastructure)
  - Built-in job status tracking
  - Rate limiting and retry mechanisms
  - Good TypeScript support
- **Cons**:
  - Tied to Redis (single point of failure if Redis fails)
  - Less feature-rich than dedicated message brokers
- **Rationale**: Redis is already required for caching, so using BullMQ avoids additional infrastructure. For higher scale, could migrate to dedicated message broker.

#### 4. **JWT vs. Session-based Auth**
**Choice**: JWT with Refresh Tokens
- **Pros**:
  - Stateless authentication (scalable across instances)
  - No server-side session storage needed
  - Works well with microservices
- **Cons**:
  - Token revocation requires token blacklist (not implemented)
  - Larger token size in requests
- **Rationale**: JWT provides better scalability and works well with stateless API architecture.

#### 5. **Socket.IO vs. Native WebSockets**
**Choice**: Socket.IO
- **Pros**:
  - Automatic reconnection handling
  - Fallback to long-polling if WebSockets unavailable
  - Built-in room/namespace management
  - Better error handling
- **Cons**:
  - Larger client library
  - Protocol overhead
- **Rationale**: Socket.IO provides better reliability and developer experience for real-time features.

#### 6. **Database Connection Pooling**
**Choice**: TypeORM default pooling
- **Pros**: Simple, built-in
- **Cons**: May need fine-tuning for high load
- **Future**: Could optimize pool size based on load testing

#### 7. **Caching Strategy**
**Choice**: Redis with TTL-based expiration
- **Pros**: 
  - Fast read performance
  - Reduces database load
- **Cons**:
  - Cache invalidation complexity
  - Additional infrastructure
- **Current Implementation**: Used for workspace member permissions and role lookups

## Scalability

### Horizontal Scaling

The architecture supports horizontal scaling:

1. **API Server Scaling**:
   - Stateless design (JWT tokens, no session storage)
   - Multiple instances can run behind a load balancer
   - Redis pub/sub ensures real-time events work across instances
   - Database connection pooling handles multiple server instances

2. **Worker Scaling**:
   - Multiple worker instances can process jobs from the same queue
   - BullMQ automatically distributes jobs across workers
   - Concurrency limits prevent resource exhaustion (5 concurrent jobs per worker)

3. **Database Scaling**:
   - Read replicas can be added for read-heavy operations
   - Connection pooling prevents connection exhaustion
   - Indexes on frequently queried fields (email, workspaceId, etc.)

4. **Redis Scaling**:
   - Redis Cluster for high availability
   - Separate Redis instances for cache vs. queues (optional)

### Performance Optimizations

1. **Database**:
   - Indexes on foreign keys and frequently queried fields
   - UUID primary keys for distributed systems
   - Efficient queries with TypeORM query builder

2. **Caching**:
   - Redis caching for permission checks and role lookups
   - TTL-based expiration to ensure data freshness

3. **Job Queue**:
   - Rate limiting (10 jobs/second per queue)
   - Concurrency limits (5 jobs per worker)
   - Automatic retry with exponential backoff

4. **API**:
   - Rate limiting middleware to prevent abuse
   - Request validation and error handling
   - Efficient JSON serialization

### Scaling Limits & Considerations

**Current Capacity (Estimated)**:
- API Servers: Can scale to 10+ instances easily
- Workers: Can scale to 20+ instances (depending on job volume)
- Database: PostgreSQL can handle 1000s of concurrent connections
- Redis: Single instance can handle 100K+ operations/second

**Bottlenecks to Monitor**:
1. **Database Connection Pool**: Monitor connection pool usage
2. **Redis Memory**: Monitor Redis memory usage for job queues
3. **Database Query Performance**: Monitor slow queries
4. **Worker Processing Time**: Monitor job processing times

**Scaling Recommendations**:
- **10K-100K users**: Current architecture should handle well
- **100K-1M users**: 
  - Add database read replicas
  - Consider Redis Cluster
  - Optimize slow queries
  - Add more worker instances
- **1M+ users**:
  - Consider database sharding
  - Implement CDN for static assets (if added)
  - Consider dedicated message broker (RabbitMQ/Kafka)
  - Implement database read/write splitting

## How to Run

### Prerequisites

- **Node.js**: v20 or higher
- **PostgreSQL**: 16 or higher
- **Redis**: 7 or higher
- **Docker & Docker Compose**: (optional, for containerized setup)
- **npm**: v9 or higher

### Environment Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd collab-workspace-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** (`.env`):
   ```env
   # Application
   NODE_ENV=development
   PORT=3000
   API_VERSION=v1

   # JWT Configuration
   JWT_SECRET=your-secret-key-change-in-production
   JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_NAME=collab_workspace

   # Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=

   # Worker Configuration (optional)
   WORKER_ENABLED=false
   ```

### Option 1: Docker Compose (Recommended)

This is the easiest way to run the entire stack:

1. **Start all services** (API, Worker, Database, Redis):
   ```bash
   docker-compose up -d
   ```

2. **View logs**:
   ```bash
   docker-compose logs -f app
   docker-compose logs -f worker
   ```

3. **Stop services**:
   ```bash
   docker-compose down
   ```

4. **Rebuild after code changes**:
   ```bash
   docker-compose up -d --build
   ```

### Option 2: Docker Compose for Dependencies Only

Run only database and Redis in Docker, run the app locally:

1. **Start dependencies**:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Build the application**:
   ```bash
   npm run build
   ```

3. **Run database migrations** (if needed):
   ```bash
   npm run migration:run
   ```

4. **Start the API server**:
   ```bash
   npm run dev
   ```

5. **Start the worker** (in a separate terminal):
   ```bash
   npm run dev:worker
   ```

### Option 3: Local Development (No Docker)

1. **Install PostgreSQL and Redis locally**

2. **Create database**:
   ```sql
   CREATE DATABASE collab_workspace;
   ```

3. **Run migrations**:
   ```bash
   npm run migration:run
   ```

4. **Start the API server**:
   ```bash
   npm run dev
   ```

5. **Start the worker** (in a separate terminal):
   ```bash
   npm run dev:worker
   ```

### Running in Production

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Set production environment variables**:
   - Ensure `NODE_ENV=production`
   - Set strong `JWT_SECRET` and `JWT_REFRESH_SECRET`
   - Configure production database and Redis credentials

3. **Run migrations**:
   ```bash
   npm run migration:run
   ```

4. **Start the API server**:
   ```bash
   npm start
   ```

5. **Start the worker** (in separate process/container):
   ```bash
   npm run start:worker
   ```

### Available Scripts

- `npm run dev` - Start API server in development mode
- `npm run dev:worker` - Start worker in development mode
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start API server in production mode
- `npm run start:worker` - Start worker in production mode
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run migration:generate` - Generate a new migration
- `npm run migration:run` - Run pending migrations
- `npm run migration:revert` - Revert last migration

### Health Check

After starting the server, verify it's running:

```bash
curl http://localhost:3000/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## API Documentation

### Interactive API Documentation

Once the server is running, access the interactive Swagger API documentation at:

**URL**: `http://localhost:3000/api/v1/docs`

The Swagger UI provides:
- Complete API endpoint documentation
- Request/response schemas
- Try-it-out functionality
- Authentication support

### API Base URL

All API endpoints are prefixed with:
```
/api/v1
```

### Authentication

Most endpoints require JWT authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Key Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get tokens
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user info

#### Workspaces
- `GET /api/v1/workspaces` - List user's workspaces
- `POST /api/v1/workspaces` - Create workspace
- `GET /api/v1/workspaces/:id` - Get workspace details
- `PUT /api/v1/workspaces/:id` - Update workspace
- `DELETE /api/v1/workspaces/:id` - Delete workspace

#### Projects
- `GET /api/v1/workspaces/:workspaceId/projects` - List projects
- `POST /api/v1/workspaces/:workspaceId/projects` - Create project
- `GET /api/v1/projects/:id` - Get project details
- `PUT /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project

#### Invitations
- `POST /api/v1/workspaces/:workspaceId/invites` - Send invitation
- `GET /api/v1/invites` - List invitations
- `POST /api/v1/invites/:id/accept` - Accept invitation
- `DELETE /api/v1/invites/:id` - Decline/cancel invitation

#### Jobs
- `POST /api/v1/jobs` - Create background job
- `GET /api/v1/jobs/:id` - Get job status

For complete API documentation, visit the Swagger UI at `/api/v1/docs`.

## Technology Stack

### Core
- **Node.js**: Runtime environment
- **TypeScript**: Type-safe JavaScript
- **Express**: Web framework

### Database & ORM
- **PostgreSQL 16**: Relational database
- **TypeORM**: ORM for database operations

### Caching & Queue
- **Redis 7**: Caching and message broker
- **BullMQ**: Job queue system
- **ioredis**: Redis client

### Authentication & Security
- **JWT (jsonwebtoken)**: Token-based authentication
- **bcrypt**: Password hashing
- **express-rate-limit**: Rate limiting

### Real-time
- **Socket.IO**: WebSocket communication
- **Redis Pub/Sub**: Multi-instance event distribution

### Development Tools
- **Jest**: Testing framework
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **ts-node-dev**: Development server

### DevOps
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **GitHub Actions**: CI/CD pipeline

## Project Structure

```
collab-workspace-backend/
├── src/
│   ├── app.ts                 # Express app configuration
│   ├── server.ts              # API server entry point
│   ├── worker.ts              # Worker service entry point
│   ├── config/                # Configuration files
│   │   ├── database.ts        # Database connection
│   │   ├── env.ts             # Environment variables
│   │   ├── queue.ts           # Job queue configuration
│   │   ├── redis.ts           # Redis connection
│   │   └── swagger.ts         # Swagger/OpenAPI config
│   ├── modules/               # Feature modules
│   │   ├── auth/              # Authentication module
│   │   ├── workspace/         # Workspace management
│   │   ├── project/           # Project management
│   │   ├── invite/            # Invitation system
│   │   ├── role/              # Role & permissions
│   │   ├── job/               # Job queue management
│   │   ├── realtime/          # WebSocket/Socket.IO
│   │   └── health/            # Health checks
│   ├── shared/                # Shared code
│   │   ├── entities/          # TypeORM entities
│   │   ├── middleware/        # Express middleware
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Utility functions
│   ├── migrations/            # Database migrations
│   ├── scripts/               # Utility scripts
│   └── __tests__/             # Test files
├── .github/
│   └── workflows/
│       └── ci.yml             # CI/CD pipeline
├── docker-compose.yml         # Production Docker setup
├── docker-compose.dev.yml     # Development Docker setup
├── Dockerfile                 # Docker image definition
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript configuration
└── jest.config.js             # Jest configuration
```

## License

ISC

