const express = require('express');
const multer = require('multer');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { serializers, compact } = require('./crud');
const {
  MAX_CV_SIZE_BYTES,
  ALLOWED_CV_MIME_TYPES,
  assertValidCvFile,
  uploadCareerCv,
  createCareerCvSignedUrl,
} = require('../utils/supabaseStorage');

const router = express.Router();

const cvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CV_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_CV_MIME_TYPES.has(file.mimetype)) {
      const error = new Error('Yalnız PDF, DOC və DOCX CV faylları qəbul olunur.');
      error.status = 400;
      return cb(error);
    }
    return cb(null, true);
  },
});

router.get('/', authenticate, authorize('admin'), asyncHandler(async (_req, res) => {
  const data = await prisma.application.findMany({ orderBy: { createdAt: 'desc' }, include: { vacancy: true } });
  res.json(data);
}));

router.post('/', cvUpload.single('cv'), asyncHandler(async (req, res) => {
  assertValidCvFile(req.file);
  const cvFilePath = await uploadCareerCv(req.file);
  const body = { ...req.body, cv_file: cvFilePath };
  const created = await prisma.application.create({ data: compact(serializers.application(body)), include: { vacancy: true } });
  res.status(201).json(created);
}));

router.put('/:id', authenticate, authorize('admin'), cvUpload.single('cv'), asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (req.file) {
    assertValidCvFile(req.file);
    body.cv_file = await uploadCareerCv(req.file);
  }
  const updated = await prisma.application.update({ where: { id: Number(req.params.id) }, data: compact(serializers.application(body)), include: { vacancy: true } });
  res.json(updated);
}));

router.post('/:id/cv-signed-url', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const application = await prisma.application.findUnique({ where: { id: Number(req.params.id) } });
  if (!application) return res.status(404).json({ message: 'Müraciət tapılmadı.' });
  if (!application.cvFile) return res.status(404).json({ message: 'Bu müraciətdə CV faylı yoxdur.' });
  const signedUrl = await createCareerCvSignedUrl(application.cvFile, Number(req.body?.expiresIn || 60));
  res.json({ signedUrl, filePath: application.cvFile, expiresIn: Number(req.body?.expiresIn || 60) });
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.application.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
