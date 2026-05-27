/**
 * Dev helper — flip a user's role to 'professional' and ensure they
 * have a Professional row. For Pro app testing when a phone was
 * accidentally registered as customer first.
 */
import { prisma } from '@sevalink/db';

async function main() {
  const phone = process.argv[2];
  if (!phone) {
    console.error('Usage: tsx scripts/promote-to-pro.ts <phone>');
    process.exit(1);
  }
  const u = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, fullName: true, role: true, professional: { select: { id: true } } },
  });
  if (!u) {
    console.error(`No user with phone ${phone}`);
    process.exit(1);
  }
  console.log(
    `Found: ${u.fullName} · role=${u.role} · professional=${u.professional ? u.professional.id : 'null'}`,
  );

  if (u.role !== 'professional') {
    await prisma.user.update({ where: { id: u.id }, data: { role: 'professional' } });
    console.log(`Updated role: customer → professional`);
  }

  if (!u.professional) {
    await prisma.professional.create({ data: { userId: u.id } });
    console.log(`Created Professional row`);
  } else {
    console.log(`Professional row already exists`);
  }

  console.log('Done. Reload Pro app + login again to pick up the new role.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
