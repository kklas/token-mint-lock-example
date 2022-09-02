import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface MintToArgs {
  amount: BN
}

export interface MintToAccounts {
  lock: PublicKey
  mintAuthorityAcc: PublicKey
  mintAuthority: PublicKey
  toTokenAcc: PublicKey
  mint: PublicKey
  tokenProgram: PublicKey
}

export const layout = borsh.struct([borsh.u64("amount")])

export function mintTo(args: MintToArgs, accounts: MintToAccounts) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.lock, isSigner: false, isWritable: false },
    { pubkey: accounts.mintAuthorityAcc, isSigner: false, isWritable: true },
    { pubkey: accounts.mintAuthority, isSigner: true, isWritable: false },
    { pubkey: accounts.toTokenAcc, isSigner: false, isWritable: true },
    { pubkey: accounts.mint, isSigner: false, isWritable: true },
    { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
  ]
  const identifier = Buffer.from([241, 34, 48, 186, 37, 179, 123, 192])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      amount: args.amount,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
