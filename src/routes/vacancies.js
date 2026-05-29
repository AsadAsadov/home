const express = require('express');
const prisma = require('../prisma');
const { crudRouter, serializers } = require('./crud');
const router = express.Router();
crudRouter({ router, prisma, model: 'vacancy', serializer: serializers.vacancy });
module.exports = router;
