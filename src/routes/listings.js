const express = require('express');
const prisma = require('../lib/prisma');
const { crudRouter, serializers } = require('./crud');
const router = express.Router();
crudRouter({ router, prisma, model: 'listing', serializer: serializers.listing, include: { user: { select: { id: true, fullname: true, email: true, role: true } } } });
module.exports = router;
