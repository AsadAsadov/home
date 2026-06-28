const express = require('express');
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, optionalAuthenticate, authorize } = require('../middleware/auth');
const controller = require('../controllers/ai-chat.controller');

const router = express.Router();
const publicLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

router.post('/ai-chat/start', publicLimiter, optionalAuthenticate, asyncHandler(controller.start));
router.post('/ai-chat/message', publicLimiter, optionalAuthenticate, asyncHandler(controller.message));
router.get('/ai-chat/history/:conversationId', publicLimiter, optionalAuthenticate, asyncHandler(controller.history));

router.get('/admin/ai-chats', authenticate, authorize('admin'), asyncHandler(controller.adminList));
router.get('/admin/ai-chats/:id', authenticate, authorize('admin'), asyncHandler(controller.adminGet));
router.post('/admin/ai-chats/:id/reply', authenticate, authorize('admin'), asyncHandler(controller.adminReply));
router.patch('/admin/ai-chats/:id/status', authenticate, authorize('admin'), asyncHandler(controller.adminStatus));

module.exports = router;
