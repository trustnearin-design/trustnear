import { prisma } from '@sevalink/db';

async function main() {
  const phone = process.argv[2];
  if (!phone) {
    console.error('Usage: tsx scripts/delete-test-user.ts <phone>');
    process.exit(1);
  }
  const u = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, fullName: true, role: true },
  });
  if (!u) {
    console.log(`No user with phone ${phone}.`);
    return;
  }
  console.log(`Deleting ${u.role} ${u.fullName} (${u.id})…`);
  await prisma.user.delete({ where: { id: u.id } });
  console.log('Deleted.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
