"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const index_js_1 = require("../../../../packages/database/src/index.js");
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    role: zod_1.z.enum(['student_online', 'student_center', 'teacher', 'admin', 'parent'])
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
    role: zod_1.z.enum(['student_online', 'student_center', 'teacher', 'admin', 'parent'])
});
const register = async (req, res) => {
    try {
        const validatedData = registerSchema.parse(req.body);
        const existingUser = await index_js_1.db.user.findUnique({
            where: { email: validatedData.email }
        });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(validatedData.password, 10);
        const newUser = await index_js_1.db.user.create({
            data: {
                ...validatedData,
                password: hashedPassword
            }
        });
        res.status(201).json({ message: 'User registered successfully', userId: newUser.id });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        console.error('Register error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const validatedData = loginSchema.parse(req.body);
        const user = await index_js_1.db.user.findFirst({
            where: {
                email: validatedData.email,
                role: validatedData.role
            }
        });
        if (!user) {
            return res.status(401).json({
                message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(validatedData.password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.REFRESH_TOKEN_SECRET || 'refresh_secret', { expiresIn: '7d' });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('🔥 CRITICAL LOGIN ERROR:', error.message);
        res.status(500).json({ message: 'Internal server error', detail: error.message });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        const user = await index_js_1.db.user.findUnique({
            where: { id: req.user.userId },
            select: { id: true, name: true, email: true, role: true }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getMe = getMe;
//# sourceMappingURL=auth.controller.js.map