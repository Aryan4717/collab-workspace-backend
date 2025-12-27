import { Router } from 'express';
import { JobController } from './job.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';

const router = Router();
const jobController = new JobController();

/**
 * @swagger
 * /api/v1/jobs:
 *   post:
 *     summary: Create a new job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [email:send, file:process, data:export, notification:send, workspace:backup]
 *               data:
 *                 type: object
 *               idempotencyKey:
 *                 type: string
 *               maxAttempts:
 *                 type: number
 *     responses:
 *       201:
 *         description: Job created successfully
 *       400:
 *         description: Invalid job type
 *       500:
 *         description: Server error
 */
router.post('/', authMiddleware, jobController.createJob.bind(jobController));

/**
 * @swagger
 * /api/v1/jobs:
 *   get:
 *     summary: Get user's jobs
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, cancelled]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: List of jobs
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, jobController.getJobs.bind(jobController));

/**
 * @swagger
 * /api/v1/jobs/{jobId}:
 *   get:
 *     summary: Get job by ID
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job details
 *       404:
 *         description: Job not found
 */
router.get('/:jobId', authMiddleware, jobController.getJob.bind(jobController));

/**
 * @swagger
 * /api/v1/jobs/{jobId}/cancel:
 *   post:
 *     summary: Cancel a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job cancelled successfully
 *       404:
 *         description: Job not found or cannot be cancelled
 */
router.post(
  '/:jobId/cancel',
  authMiddleware,
  jobController.cancelJob.bind(jobController)
);

export default router;
