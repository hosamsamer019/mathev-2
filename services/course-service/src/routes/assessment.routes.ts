import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import * as assessmentController from '../controllers/assessment.controller.js';

const router = Router();

// Student / Generic endpoints
router.get('/', verifyToken, assessmentController.getAllAssessments);
router.get('/:id', verifyToken, assessmentController.getAssessment);
router.post('/:id/start', verifyToken, assessmentController.startAssessment);
router.put('/:id/attempt/answers', verifyToken, assessmentController.saveAnswers);
router.post('/:id/attempt/submit', verifyToken, assessmentController.submitAssessment);
router.post('/:id/attempt/violation', verifyToken, assessmentController.reportAssessmentViolation);
router.get('/:id/attempts/:attemptId/review', verifyToken, assessmentController.getAssessmentReview);

// Teacher endpoints
router.get('/teacher/results/:id', verifyToken, assessmentController.getAssessmentResults);
router.get('/teacher/external-results/:id', verifyToken, assessmentController.getExternalResults);
router.get('/admin/external-attempts', verifyToken, assessmentController.getAllExternalAttempts);
router.get('/teacher/students/:studentId', verifyToken, assessmentController.getStudentAssessments);
router.post('/', verifyToken, assessmentController.createAssessment);
router.put('/:id', verifyToken, assessmentController.updateAssessment);
router.delete('/:id', verifyToken, assessmentController.deleteAssessment);

// Parent endpoints
router.get('/parent/children/:studentId', verifyToken, assessmentController.getParentChildAssessments);

export default router;
