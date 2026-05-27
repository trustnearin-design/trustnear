import { prisma } from '@sevalink/db';
async function main() {
  const u = await prisma.user.findUnique({
    where: { phone: '+919999000001' },
    select: {
      id: true,
      phone: true,
      fullName: true,
      role: true,
      professional: {
        select: { id: true, aadhaarVerified: true, panVerified: true, bankVerified: true },
      },
    },
  });
  console.log(JSON.stringify(u, null, 2));
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
