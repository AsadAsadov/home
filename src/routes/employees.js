const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

function safe(employee) {
  const { passwordHash, ...rest } = employee;
  return rest;
}

function employeeData(body) {
  const out = {
    firstName: body.first_name ?? body.firstName,
    lastName: body.last_name ?? body.lastName,
    phone: body.phone,
    email: body.email,
    role: body.role ?? 'employee',
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}

router.get('/', authenticate, authorize('admin'), asyncHandler(async (_req, res) => {
  const employees = await prisma.employee.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(employees.map(safe));
}));

router.post('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const passwordHash = await bcrypt.hash(req.body.password || 'BestHome123!', 12);
  const employee = await prisma.employee.create({ data: { ...employeeData(req.body), passwordHash } });
  res.status(201).json(safe(employee));
}));

router.put('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const nextData = employeeData(req.body);
  if (req.body.password) nextData.passwordHash = await bcrypt.hash(req.body.password, 12);
  const employee = await prisma.employee.update({ where: { id: Number(req.params.id) }, data: nextData });
  res.json(safe(employee));
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await prisma.employee.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;
