const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main(){
  await prisma.message.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.user.deleteMany();

  const pwd = await bcrypt.hash('password', 10);
  const alice = await prisma.user.create({ data: { email: 'alice@example.com', name: 'Alice', password: pwd } });
  const bob = await prisma.user.create({ data: { email: 'bob@example.com', name: 'Bob', password: pwd } });

  const general = await prisma.channel.create({ data: { name: 'general' } });
  const random = await prisma.channel.create({ data: { name: 'random' } });

  await prisma.membership.createMany({ data: [
    { userId: alice.id, channelId: general.id },
    { userId: bob.id, channelId: general.id },
    { userId: alice.id, channelId: random.id }
  ]});

  await prisma.message.createMany({ data: [
    { text: 'Welcome to general', senderId: alice.id, channelId: general.id },
    { text: 'Hi Alice!', senderId: bob.id, channelId: general.id },
    { text: 'Random chat', senderId: alice.id, channelId: random.id }
  ]});

  console.log('Seed completed');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
