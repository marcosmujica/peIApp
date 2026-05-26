import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Wallet } from './src/wallets/entities/wallet.entity';
import { TicketDetail } from './src/tickets/entities/ticket-detail.entity';
import { Ticket } from './src/tickets/entities/ticket.entity';
import { User } from './src/users/entities/user.entity';
import { SYSTEM_WALLET_NAME } from './src/constants';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [Wallet, TicketDetail, Ticket, User],
  synchronize: false,
});

async function run() {
  console.log("Connecting to", process.env.DATABASE_HOST);
  await dataSource.initialize();
  console.log("Database initialized");

  const wallets = await dataSource.getRepository(Wallet).find();
  console.log(`Found ${wallets.length} wallets`);

  for (const wallet of wallets) {
    const isSystemWallet = wallet.name.toLowerCase().trim() === SYSTEM_WALLET_NAME.toLowerCase();
    
    // Buscar detalles en TicketDetail
    const qb = dataSource.getRepository(TicketDetail).createQueryBuilder('detail')
      .leftJoinAndSelect('detail.ticket', 'ticket')
      .where('detail.walletId = :walletId', { walletId: wallet.walletId });

    if (isSystemWallet) {
      qb.orWhere('(detail.walletId IS NULL AND detail.userId = :userId)', { userId: wallet.ownerId });
    }

    const details = await qb.getMany();

    let balance = 0;

    for (const d of details) {
      if (!d.ticket) continue;
      const amount = Number(d.ticket.amount);
      if (d.type === 'income') {
        balance += amount;
      } else if (d.type === 'expense') {
        balance -= amount;
      }
    }

    // Balance ya se calculó en el bucle superior, por lo que simplemente llamamos al update.

    await dataSource.getRepository(Wallet).update(wallet.walletId, {
      balance,
    });
    console.log(`Updated wallet ${wallet.name} (${wallet.walletId}) - Balance: ${balance}`);
  }

  await dataSource.destroy();
  console.log("Done");
}

run().catch(console.error);
