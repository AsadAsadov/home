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

  if (await prisma.vacancy.count() === 0) {
    await prisma.vacancy.create({ data: { title: 'Daşınmaz Əmlak Agenti', employmentType: 'Tam ştat', salary: 'Yüksək Faiz + Sabit', city: 'Bakı (Nardaran)', description: 'Premium əmlak bazarında təcrübəli komanda üzvü axtarırıq.' } });
  }

  if (await prisma.gallery.count() === 0) {
    await prisma.gallery.create({ data: { title: 'Sea Breeze İcma Görüşü 2026', mediaType: 'image', imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80', thumbnailUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80', description: 'Müştərilər və komanda üzvləri üçün keçirilən təqdimat görüşü.' } });
  }
}

main().then(async () => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
