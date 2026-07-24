"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const course_controller_js_1 = require("../controllers/course.controller.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const router = (0, express_1.Router)();
router.get('/', course_controller_js_1.getCourses);
router.get('/:id', course_controller_js_1.getCourseDetails);
// Course Management (restricted to teachers and admins)
router.post('/', auth_middleware_js_1.verifyToken, (0, auth_middleware_js_1.checkRole)(['teacher', 'admin']), course_controller_js_1.createCourse);
router.post('/modules', auth_middleware_js_1.verifyToken, (0, auth_middleware_js_1.checkRole)(['teacher', 'admin']), course_controller_js_1.createModule);
router.post('/lessons', auth_middleware_js_1.verifyToken, (0, auth_middleware_js_1.checkRole)(['teacher', 'admin']), course_controller_js_1.createLesson);
// Student lesson progress tracking
router.post('/progress', auth_middleware_js_1.verifyToken, course_controller_js_1.updateProgress);
exports.default = router;
//# sourceMappingURL=course.routes.js.map