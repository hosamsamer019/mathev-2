"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const homework_controller_js_1 = require("../controllers/homework.controller.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const router = (0, express_1.Router)();
// Public / Student accessible GET routes
router.get('/', auth_middleware_js_1.verifyToken, homework_controller_js_1.getAllHomeworks);
router.get('/course/:courseId', auth_middleware_js_1.verifyToken, homework_controller_js_1.getHomeworksByCourse);
router.get('/:id', auth_middleware_js_1.verifyToken, homework_controller_js_1.getHomeworkDetails);
// Student submission routes
router.post('/:id/submit', auth_middleware_js_1.verifyToken, homework_controller_js_1.submitHomework);
router.get('/:id/submission', auth_middleware_js_1.verifyToken, homework_controller_js_1.getStudentSubmission);
// Admin / Teacher Management routes
router.post('/', auth_middleware_js_1.verifyToken, (0, auth_middleware_js_1.checkRole)(['teacher', 'admin']), homework_controller_js_1.createHomework);
router.post('/questions', auth_middleware_js_1.verifyToken, (0, auth_middleware_js_1.checkRole)(['teacher', 'admin']), homework_controller_js_1.addQuestion);
exports.default = router;
//# sourceMappingURL=homework.routes.js.map