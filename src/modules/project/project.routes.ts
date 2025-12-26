import { Router } from 'express';
import {
  createProject,
  getAllProjects,
  getProject,
  updateProject,
  deleteProject,
} from './project.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management endpoints
 */

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProjectDto'
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Project'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Workspace not found or access denied
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware, createProject);

/**
 * @swagger
 * /projects/workspace/{workspaceId}:
 *   get:
 *     summary: Get all projects in a workspace
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Workspace ID
 *     responses:
 *       200:
 *         description: List of projects
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Project'
 *       404:
 *         description: Workspace not found or access denied
 *       401:
 *         description: Unauthorized
 */
router.get('/workspace/:workspaceId', authMiddleware, getAllProjects);

/**
 * @swagger
 * /projects/workspace/{workspaceId}/{id}:
 *   get:
 *     summary: Get a project by ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Workspace ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Project'
 *       404:
 *         description: Project or workspace not found
 *       401:
 *         description: Unauthorized
 */
router.get('/workspace/:workspaceId/:id', authMiddleware, getProject);

/**
 * @swagger
 * /projects/workspace/{workspaceId}/{id}:
 *   put:
 *     summary: Update a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Workspace ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProjectDto'
 *     responses:
 *       200:
 *         description: Project updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Project'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Project or workspace not found
 *       401:
 *         description: Unauthorized
 */
router.put('/workspace/:workspaceId/:id', authMiddleware, updateProject);

/**
 * @swagger
 * /projects/workspace/{workspaceId}/{id}:
 *   delete:
 *     summary: Delete a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Workspace ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Project or workspace not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/workspace/:workspaceId/:id', authMiddleware, deleteProject);

export default router;
