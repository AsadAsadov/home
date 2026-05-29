require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');

async function main() {
  const adminEmail = 'admin@besthome.az';
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin12345', 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: 'admin' },
    create: { fullname: 'BestHome Admin', email: adminEmail, passwordHash, role: 'admin' },
  });

  await prisma.employee.upsert({
    where: { email: 'elnur@besthome.az' },
    update: {},
    create: {
      firstName: 'Elnur',
      lastName: 'Qasımov',
      phone: '+994503456789',
      email: 'elnur@besthome.az',
      passwordHash: await bcrypt.hash('agent123', 12),
      role: 'employee',
    },
  });

  if (await prisma.vacancy.count() === 0) {
    await prisma.vacancy.create({ data: { title: 'Daşınmaz Əmlak Agenti', employmentType: 'Tam ştat', salary: 'Yüksək Faiz + Sabit', city: 'Bakı (Nardaran)', description: 'Premium əmlak bazarında təcrübəli komanda üzvü axtarırıq.' } });
  }

  if (await prisma.gallery.count() === 0) {
    await prisma.gallery.create({ data: { title: 'Sea Breeze Rəsmi Tərəfdaşlıq Forumu 2026', mediaType: 'image', imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80', thumbnailUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80', description: 'Rəhbərlik səviyyəsində keçirilən rəsmi tərəfdaşlıq tədbiri.' } });
  }
}

main().then(async () => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
