const express = require('express');
const prisma = require('../prisma');
const { crudRouter, serializers } = require('./crud');
const router = express.Router();
crudRouter({ router, prisma, model: 'project', serializer: serializers.project });
module.exports = router;
