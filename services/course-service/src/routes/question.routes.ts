import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import * as questionController from '../controllers/question.controller.js';

const router = Router();

router.post('/', verifyToken, questionController.createQuestion);
router.get('/', verifyToken, questionController.getQuestions);
router.put('/:id', verifyToken, questionController.updateQuestion);
router.delete('/:id', verifyToken, questionController.deleteQuestion);

export default router;
