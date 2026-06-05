const express = require('express');
const { createUpload } = require('../middleware/upload');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { serializers, compact } = require('./crud');
const { notifyAdmins } = require('../utils/inAppNotifications');
const {
  CAREER_CV_BUCKET,
  MAX_CV_SIZE_BYTES,
  ALLOWED_CV_MIME_TYPES,
  assertValidCvFile,
  uploadCareerCv,
  normalizeStorageObjectPath,
  checkCareerCvObjectLocations,
  createCareerCvSignedUrlDebug,
} = require('../utils/supabaseStorage');

const router = express.Router();

const cvUpload = createUpload('career-cv', {
  fileSize: MAX_CV_SIZE_BYTES, files: 1,
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_CV_MIME_TYPES.has(file.mimetype)) { const error = new Error('Yalnız PDF, DOC və DOCX CV faylları qəbul olunur.'); error.status = 400; return cb(error); }
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
  Promise.resolve(notifyAdmins({
    title: 'Yeni vakansiya müraciəti',
    message: `${created.fullname}${created.vacancy?.title ? ` — ${created.vacancy.title}` : ''}`,
    type: 'vacancy_application',
    link: '/admin/applications',
  })).catch(() => {});
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
  if (String(application.cvFile).startsWith('/uploads/')) {
    const normalizedPath = String(application.cvFile).replace(/^\/uploads\/career-cv\//, '');
    return res.json({
      signedUrl: application.cvFile,
      bucket: CAREER_CV_BUCKET,
      originalPath: application.cvFile,
      filePath: application.cvFile,
      normalizedPath,
      createSignedUrlPath: normalizedPath,
      createSignedUrlParams: null,
      createSignedUrlResponse: null,
      storageLocations: null,
      supabaseResponse: { data: null, error: null },
      supabaseRawResponse: null,
      expiresIn: null,
    });
  }
  try {
    const originalPath = application.cvFile;
    const normalizedPath = normalizeStorageObjectPath(originalPath, CAREER_CV_BUCKET);
    console.info('[applications] createSignedUrl path normalization', {
      applicationId: application.id,
      bucket: CAREER_CV_BUCKET,
      originalPath,
      normalizedPath,
      expectedSample: {
        originalPath: `${CAREER_CV_BUCKET}/2026/05/file.pdf`,
        bucket: CAREER_CV_BUCKET,
        path: '2026/05/file.pdf',
      },
    });
    const storageLocations = await checkCareerCvObjectLocations(originalPath);
    const result = await createCareerCvSignedUrlDebug(originalPath, Number(req.body?.expiresIn || 60));
    console.info('[applications] createSignedUrl debug', {
      applicationId: application.id,
      bucket: result.bucket,
      originalPath: result.originalPath,
      normalizedPath: result.normalizedPath,
      finalSignedUrl: result.signedUrl,
      requestUrl: result.requestUrl,
      createSignedUrlParams: result.createSignedUrlParams,
      createSignedUrlResponse: result.createSignedUrlResponse,
      storageLocations,
      supabaseResponse: {
        data: result.ok ? result.supabaseResponse : null,
        error: result.ok ? null : result.supabaseResponse,
      },
      status: result.status,
    });
    const responseBody = {
      signedUrl: result.signedUrl,
      bucket: result.bucket,
      originalPath: result.originalPath,
      filePath: application.cvFile,
      normalizedPath: result.normalizedPath,
      createSignedUrlPath: result.normalizedPath,
      createSignedUrlParams: result.createSignedUrlParams,
      createSignedUrlResponse: result.createSignedUrlResponse,
      storageLocations,
      supabaseResponse: {
        data: result.createSignedUrlResponse.data,
        error: result.createSignedUrlResponse.error,
      },
      supabaseRawResponse: result.supabaseResponse,
      expiresIn: Number(req.body?.expiresIn || 60),
    };
    console.log('[applications] response', responseBody);
    return res.json(responseBody);
  } catch (error) {
    console.error('[applications] createSignedUrl error', {
      applicationId: application.id,
      filePath: application.cvFile,
      message: error.message,
      code: error.code,
      meta: error.meta || error.debug,
      stack: error.stack,
    });
    return res.status(error.status || 500).json({
      message: error.message,
      code: error.code,
      filePath: application.cvFile,
      normalizedPath: error.meta?.normalizedPath || error.debug?.normalizedPath,
      createSignedUrlPath: error.meta?.normalizedPath || error.debug?.normalizedPath,
      supabaseResponse: {
        data: null,
        error: error.meta?.supabaseResponse,
      },
      supabaseRawResponse: error.meta?.supabaseResponse,
      status: error.meta?.status,
    });
  }
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.application.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
