import { Router } from 'express';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';
import { imageUploadMiddleware } from '../middlewares/upload.middleware.js';
import * as assessmentController from '../controllers/assessment.controller.js';

const router = Router();

// Asset endpoints (General / Draft / Admin)
router.post('/assets/upload', verifyToken, checkRole(['TEACHER', 'ADMIN']), imageUploadMiddleware.single('image'), assessmentController.uploadQuestionAsset);
router.delete('/assets/:assetId', verifyToken, checkRole(['TEACHER', 'ADMIN']), assessmentController.deleteQuestionAsset);
router.post('/admin/cleanup-assets', verifyToken, checkRole(['TEACHER', 'ADMIN']), assessmentController.cleanupAssessmentAssets);

// Teacher and Admin management endpoints
router.get('/teacher/results/:id', verifyToken, assessmentController.getAssessmentResults);
router.get('/teacher/external-results/:id', verifyToken, assessmentController.getExternalResults);
router.get('/admin/external-attempts', verifyToken, assessmentController.getAllExternalAttempts);
router.get('/teacher/students/:studentId', verifyToken, assessmentController.getStudentAssessments);
router.post('/', verifyToken, assessmentController.createAssessment);

// Parent endpoints
router.get('/parent/children/:studentId', verifyToken, assessmentController.getParentChildAssessments);

// Student / Generic endpoints
router.get('/', verifyToken, assessmentController.getAllAssessments);
router.get('/:id', verifyToken, assessmentController.getAssessment);
router.put('/:id', verifyToken, assessmentController.updateAssessment);
router.delete('/:id', verifyToken, assessmentController.deleteAssessment);
router.post('/:id/start', verifyToken, assessmentController.startAssessment);
router.put('/:id/attempt/answers', verifyToken, assessmentController.saveAnswers);
router.post('/:id/attempt/submit', verifyToken, assessmentController.submitAssessment);
router.post('/:id/attempt/violation', verifyToken, assessmentController.reportAssessmentViolation);
router.get('/:id/attempts/:attemptId/review', verifyToken, assessmentController.getAssessmentReview);

// Per-assessment asset endpoints
router.post('/:id/assets/upload', verifyToken, checkRole(['TEACHER', 'ADMIN']), imageUploadMiddleware.single('image'), assessmentController.uploadQuestionAsset);
router.get('/:id/assets', verifyToken, assessmentController.getAssessmentAssets);
router.delete('/:id/assets/:assetId', verifyToken, checkRole(['TEACHER', 'ADMIN']), assessmentController.deleteQuestionAsset);

export default router;

