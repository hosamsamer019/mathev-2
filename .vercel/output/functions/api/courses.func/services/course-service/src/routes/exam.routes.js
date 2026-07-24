"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const exam_controller_js_1 = require("../controllers/exam.controller.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const router = (0, express_1.Router)();
// All exam routes require authentication
router.use(auth_middleware_js_1.verifyToken);
router.get('/course/:courseId', exam_controller_js_1.getExamsByCourse);
router.get('/:id', exam_controller_js_1.getExamDetails);
router.post('/:id/start', exam_controller_js_1.startAttempt);
router.post('/:id/sync', exam_controller_js_1.syncDraft);
router.post('/:id/violation', exam_controller_js_1.logViolation);
router.post('/:id/submit', exam_controller_js_1.submitAttempt);
exports.default = router;
//# sourceMappingURL=exam.routes.js.map