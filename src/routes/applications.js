const express = require('express');
const prisma = require('../lib/prisma');
const upload = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { serializers, compact } = require('./crud');
const router = express.Router();

router.get('/', authenticate, authorize('admin'), asyncHandler(async (_req, res) => {
  const data = await prisma.application.findMany({ orderBy: { createdAt: 'desc' }, include: { vacancy: true } });
  res.json(data);
}));

router.post('/', upload.single('cv'), asyncHandler(async (req, res) => {
  const body = { ...req.body, cv_file: req.file ? `/uploads/${req.file.filename}` : req.body.cv_file };
  const created = await prisma.application.create({ data: compact(serializers.application(body)), include: { vacancy: true } });
  res.status(201).json(created);
}));

router.put('/:id', authenticate, authorize('admin'), upload.single('cv'), asyncHandler(async (req, res) => {
  const body = { ...req.body, cv_file: req.file ? `/uploads/${req.file.filename}` : req.body.cv_file };
  const updated = await prisma.application.update({ where: { id: Number(req.params.id) }, data: compact(serializers.application(body)), include: { vacancy: true } });
  res.json(updated);
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.application.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
