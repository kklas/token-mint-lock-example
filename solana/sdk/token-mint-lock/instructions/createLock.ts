import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface CreateLockArgs {
  lockAdmin: PublicKey
}

export interface CreateLockAccounts {
  lock: PublicKey
  mint: PublicKey
  mintAuthority: PublicKey
  payer: PublicKey
  systemProgram: PublicKey
  tokenProgram: PublicKey
}

export const layout = borsh.struct([borsh.publicKey("lockAdmin")])

export function createLock(args: CreateLockArgs, accounts: CreateLockAccounts) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.lock, isSigner: false, isWritable: true },
    { pubkey: accounts.mint, isSigner: false, isWritable: true },
    { pubkey: accounts.mintAuthority, isSigner: true, isWritable: false },
    { pubkey: accounts.payer, isSigner: true, isWritable: true },
    { pubkey: accounts.systemProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
  ]
  const identifier = Buffer.from([171, 216, 92, 167, 165, 8, 153, 90])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      lockAdmin: args.lockAdmin,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
