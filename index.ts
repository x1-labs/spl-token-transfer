#!/usr/bin/env tsx

import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createTransferInstruction } from '@solana/spl-token';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import * as assert from "node:assert";

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <TOKEN_MINT_ADDRESS> <TOKEN_AMOUNT> <RECIPIENT_ADDRESS> [--keypair <KEYPAIR_PATH>]')
  .demandCommand(3)
  .option('keypair', {
    alias: 'k',
    describe: 'Path to Solana keypair file',
    type: 'string',
    demandOption: true,
  })
  .help()
  .argv as {
  _: (string | number)[];
  keypair: string;
};

async function main() {
  const [mintStr, amountStr, recipientStr] = argv._.map(String);
  assert.ok(mintStr, 'Invalid mint address');
  assert.ok(amountStr, 'Invalid mint address');
  assert.ok(recipientStr, 'Invalid mint address');

  const mint = new PublicKey(mintStr);
  const recipient = new PublicKey(recipientStr);
  const amount = parseFloat(amountStr);

  const payerKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(argv.keypair, 'utf8')))
  );

  const connection = new Connection('https://rpc.testnet.x1.xyz', "processed");

  const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payerKeypair,
    mint,
    payerKeypair.publicKey
  );

  const toTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payerKeypair,
    mint,
    recipient
  );

  const tx = new Transaction().add(
    createTransferInstruction(
      fromTokenAccount.address,
      toTokenAccount.address,
      payerKeypair.publicKey,
      BigInt(amount * 10 ** 6) // Adjust decimals as needed
    )
  );

  console.time("Transaction Confirmation Time");
  const sig = await connection.sendTransaction(tx, [payerKeypair], {
    skipPreflight: true,
  });

  console.log(`Transaction sent: ${sig}`);
  console.timeEnd("Transaction Confirmation Time");
}

main().catch((err) => {
  console.error('Transfer failed:', err);
  process.exit(1);
});