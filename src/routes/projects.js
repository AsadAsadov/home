const express = require('express');
const prisma = require('../lib/prisma');
const { crudRouter, serializers } = require('./crud');
const router = express.Router();
crudRouter({ router, prisma, model: 'project', serializer: serializers.project });
module.exports = router;
