const express = require('express');
const prisma = require('../lib/prisma');
const { crudRouter, serializers } = require('./crud');
const router = express.Router();
crudRouter({ router, prisma, model: 'vacancy', serializer: serializers.vacancy });
module.exports = router;
