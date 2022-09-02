import * as anchor from "@project-serum/anchor";
import * as token from "@solana/spl-token";

import { createLock, createMintAuthority, mintTo } from "../sdk/token-mint-lock/instructions"
import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js"
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, getMinimumBalanceForRentExemptMint, getOrCreateAssociatedTokenAccount, MINT_SIZE, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { mint as faucetMint } from "../sdk/faucet/instructions"
import { PROGRAM_ID as MINT_LOCK_PROGRAM_ID } from "../sdk/token-mint-lock/programId";
import { PROGRAM_ID as FAUCET_PROGRAM_ID } from "../sdk/faucet/programId";
import { BN } from "bn.js";
import { expect } from "chai";

const SYSTEM_PROGRAM_ID = new PublicKey("11111111111111111111111111111111")

async function newTx(provider: anchor.AnchorProvider) {
  const latestBlockhash = await provider.connection.getLatestBlockhash()
  return new Transaction({
    feePayer: provider.wallet.publicKey,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight 
  })
}

describe("faucet", () => {
  it("mints", async () => {
    const provider = anchor.AnchorProvider.local();

    const admin = Keypair.generate()
    const mint = Keypair.generate()
    const [lock, _] = await PublicKey.findProgramAddress([mint.publicKey.toBuffer()], MINT_LOCK_PROGRAM_ID)

    // create mint
    {
      const lamports = await getMinimumBalanceForRentExemptMint(provider.connection);
      const tx = await newTx(provider)
      tx.add(
        SystemProgram.createAccount({
          fromPubkey: provider.wallet.publicKey,
          newAccountPubkey: mint.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
      )
      tx.add(
        token.createInitializeMintInstruction(mint.publicKey, 6, admin.publicKey, null)
      )
      await provider.sendAndConfirm(tx, [mint])
    }

    // create lock
    {
      const tx = await newTx(provider)
      tx.add(
        createLock({
          lockAdmin: admin.publicKey
        }, {
          lock,
          mint: mint.publicKey,
          mintAuthority: admin.publicKey,
          payer: provider.wallet.publicKey,
          systemProgram: SYSTEM_PROGRAM_ID,
          tokenProgram: token.TOKEN_PROGRAM_ID
        })
      )
      await provider.sendAndConfirm(tx, [admin])
    }


    // create a mint authority for the faucet
    const mintAuthorityAcc = Keypair.generate()
    const [mintAuthority, mintAuthorityBump] = await PublicKey.findProgramAddress(
      [mintAuthorityAcc.publicKey.toBuffer()],
      FAUCET_PROGRAM_ID
    )
    {
      const tx = await newTx(provider)
      tx.add(
        createMintAuthority({
          authority: mintAuthority,
          maxMintPerDay: new BN(500),
          isEnabled: true
        }, {
          lock,
          lockAdmin: admin.publicKey,
          mintAuthorityAcc: mintAuthorityAcc.publicKey,
          payer: provider.wallet.publicKey,
          systemProgram: SYSTEM_PROGRAM_ID
        })
      )
      await provider.sendAndConfirm(tx, [admin, mintAuthorityAcc])
    }

    // mint tokens using the faucet
    const assocToken = await getAssociatedTokenAddress(mint.publicKey, provider.wallet.publicKey)
    {
      const tx = await newTx(provider)
      tx.add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey, assocToken, provider.wallet.publicKey, mint.publicKey  
        )
      )
      tx.add(
        faucetMint({
          amount: new BN(300),
          authorityBump: mintAuthorityBump
        }, {
          lock,
          mintAuthorityAcc: mintAuthorityAcc.publicKey,
          mintAuthority: mintAuthority,
          toTokenAcc: assocToken,
          mint: mint.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          mintLockProgram: MINT_LOCK_PROGRAM_ID
        })
      )
      await provider.sendAndConfirm(tx)

      const tokenAcc = await token.getAccount(provider.connection, assocToken)
      expect(tokenAcc.amount.toString()).equals("300")
    }
  });
});

