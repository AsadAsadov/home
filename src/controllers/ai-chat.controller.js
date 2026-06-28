const service = require('../services/ai-chat.service');

exports.start = async (req, res) => res.json(await service.startConversation(req.body));
exports.message = async (req, res) => res.json(await service.sendMessage(req.body));
exports.history = async (req, res) => res.json(await service.history(req.params.conversationId));
exports.adminList = async (_req, res) => res.json(await service.adminList());
exports.adminGet = async (req, res) => {
  const row = await service.adminGet(req.params.id);
  if (!row) return res.status(404).json({ message: 'Conversation not found.' });
  return res.json(row);
};
exports.adminReply = async (req, res) => res.json(await service.adminReply(req.params.id, req.body?.message || req.body?.reply || ''));
exports.adminStatus = async (req, res) => res.json(await service.adminStatus(req.params.id, req.body?.status));
