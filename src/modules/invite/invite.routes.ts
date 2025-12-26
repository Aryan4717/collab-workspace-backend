import { Router } from 'express';
import {
  sendInvite,
  acceptInvite,
  declineInvite,
  getWorkspaceInvites,
  cancelInvite,
} from './invite.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { requireWorkspaceAccess } from '../../shared/middleware/rbac.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Invites
 *   description: Workspace invitation management endpoints
 */

// All invite routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /workspaces/{workspaceId}/invites:
 *   post:
 *     summary: Send an invite to a user
 *     tags: [Invites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
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
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [owner, collaborator, viewer]
 *                 default: viewer
 *     responses:
 *       201:
 *         description: Invite sent successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.post(
  '/workspaces/:workspaceId/invites',
  requireWorkspaceAccess('canInvite'),
  sendInvite
);

/**
 * @swagger
 * /workspaces/{workspaceId}/invites:
 *   get:
 *     summary: Get all invites for a workspace
 *     tags: [Invites]
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
 *         description: List of invites
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.get('/workspaces/:workspaceId/invites', getWorkspaceInvites);

/**
 * @swagger
 * /workspaces/{workspaceId}/invites/{inviteId}:
 *   delete:
 *     summary: Cancel an invite
 *     tags: [Invites]
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
 *         name: inviteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Invite cancelled successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.delete('/workspaces/:workspaceId/invites/:inviteId', cancelInvite);

/**
 * @swagger
 * /invites/accept:
 *   post:
 *     summary: Accept an invite
 *     tags: [Invites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invite accepted successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/invites/accept', acceptInvite);

/**
 * @swagger
 * /invites/decline:
 *   post:
 *     summary: Decline an invite
 *     tags: [Invites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invite declined successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/invites/decline', declineInvite);

export default router;

