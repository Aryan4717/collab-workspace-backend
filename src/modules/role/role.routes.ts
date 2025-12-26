import { Router } from 'express';
import {
  updateMemberRole,
  removeMember,
  getWorkspaceMembers,
} from './role.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Role and member management endpoints
 */

// All role routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /workspaces/{workspaceId}/members:
 *   get:
 *     summary: Get all members of a workspace
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of workspace members
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.get('/workspaces/:workspaceId/members', getWorkspaceMembers);

/**
 * @swagger
 * /workspaces/{workspaceId}/members/{memberId}/role:
 *   put:
 *     summary: Update a member's role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [collaborator, viewer]
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.put('/workspaces/:workspaceId/members/:memberId/role', updateMemberRole);

/**
 * @swagger
 * /workspaces/{workspaceId}/members/{memberId}:
 *   delete:
 *     summary: Remove a member from workspace
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Member removed successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.delete('/workspaces/:workspaceId/members/:memberId', removeMember);

export default router;

