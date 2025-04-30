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

  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(argv.keypair, 'utf8')))
  );

  const connection = new Connection('https://rpc.testnet.x1.xyz', "processed");

  const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  const toTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    recipient
  );

  for (let i = 0; i < 10; i++) {

    const tx = new Transaction().add(
      createTransferInstruction(
        fromTokenAccount.address,
        toTokenAccount.address,
        payer.publicKey,
        BigInt(amount * 10 ** 6) // Adjust decimals as needed
      )
    );

    // sign the transaction
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    tx.sign(payer); // Sign locally

    const serialized = tx.serialize();

    console.time("Elapsed");
    const sig = await connection.sendRawTransaction(serialized, {
      skipPreflight: true,
    });

    console.log(`Transaction sent: ${sig}`);
    console.timeEnd("Elapsed");
  }
}

main().catch((err) => {
  console.error('Transfer failed:', err);
  process.exit(1);
});