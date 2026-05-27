import { prisma } from '@sevalink/db';
const user = await prisma.user.findFirst({
  where: { phone: '+919876500020' },
  select: { id: true, fullName: true, deviceToken: true, role: true },
});
console.log(JSON.stringify(user, null, 2));
process.exit(0);
