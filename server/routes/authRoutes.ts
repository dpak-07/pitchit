import { Router } from 'express';
import { register, login, getMe, logout } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { validateBody, registerSchema, loginSchema } from '../middleware/validate';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.get('/me', requireAuth, getMe);
router.post('/logout', logout);

export default router;
