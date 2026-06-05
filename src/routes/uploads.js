const express = require('express');
const { createUpload, localUploadUrl } = require('../middleware/upload');
const upload = createUpload('siteimage');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

router.post('/', authenticate, authorize('admin'), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'file is required.' });
  return res.status(201).json({ url: localUploadUrl(req.file), filename: req.file.filename, mimetype: req.file.mimetype });
});

module.exports = router;
