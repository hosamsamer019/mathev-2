import { Router } from 'express';
import { verifyToken, AuthRequest } from '../middlewares/auth.middleware.js';
import { getUsers, createUser, updateUser, deleteUser, getParentChildren, getRisks } from '../controllers/user.controller.js';

const router = Router();

// Admin / User Management Routes
router.get('/risks', verifyToken, getRisks);
router.get('/users', verifyToken, getUsers);
router.post('/users', verifyToken, createUser);
router.put('/users/:id', verifyToken, updateUser);
router.delete('/users/:id', verifyToken, deleteUser);
router.get('/parent/children', verifyToken, getParentChildren);

router.get('/profile', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { db } = await import('../../../../packages/database/src/index.js');
    const user = await db.user.findUnique({ 
      where: { id: req.user?.userId },
      include: { centerGroup: true }
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});



export default router;
