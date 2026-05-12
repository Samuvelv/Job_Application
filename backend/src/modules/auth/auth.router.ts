// src/modules/auth/auth.router.ts
import { Router } from 'express';
import { authLimiter } from '../../middleware/rateLimiter';
import { authenticate } from '../../middleware/authenticate';
import * as ctrl from './auth.controller';

const router = Router();

router.post('/login',       authLimiter, ctrl.login);
router.post('/verify-otp',  authLimiter, ctrl.verifyOtp);
router.post('/resend-otp',  authLimiter, ctrl.resendOtp);
router.post('/refresh',     authLimiter, ctrl.refresh);
router.post('/logout',      authenticate, ctrl.logout);
router.get('/me',           authenticate, ctrl.getMe);

export default router;
