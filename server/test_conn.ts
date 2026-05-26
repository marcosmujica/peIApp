import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Wallet } from './src/wallets/entities/wallet.entity';
dotenv.config();

async function test() {
  console.log("Connecting to", process.env.DATABASE_HOST);
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    entities: [Wallet],
    synchronize: false,
    ssl: false
  });
  await ds.initialize();
  console.log("Connected!");
  const count = await ds.getRepository(Wallet).count();
  console.log("Wallet count:", count);
  await ds.destroy();
}
test().catch(console.error);
