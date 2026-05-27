/**
 * One-shot dev script: for any User with role=professional that's missing
 * a Professional row (because they signed up before findOrCreateUser was
 * patched to auto-create one), create the row with empty defaults so
 * /pros/me + /verify/status work for them.
 */
import { prisma } from '@sevalink/db';

async function main() {
  const stragglers = await prisma.user.findMany({
    where: { role: 'professional', professionalProfile: null },
    select: { id: true, phone: true, fullName: true },
  });

  if (stragglers.length === 0) {
    console.log('No missing Professional rows — nothing to do.');
    return;
  }

  console.log(`Found ${stragglers.length} pros without a Professional row:`);
  for (const u of stragglers) {
    console.log(`  • ${u.phone} (${u.fullName})`);
  }

  await prisma.professional.createMany({
    data: stragglers.map((u) => ({ userId: u.id })),
  });

  console.log(`✓ Created ${stragglers.length} Professional row(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
