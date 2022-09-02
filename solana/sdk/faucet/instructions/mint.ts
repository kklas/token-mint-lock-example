import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface MintArgs {
  amount: BN
  authorityBump: number
}

export interface MintAccounts {
  /**
   * compute units by not deserializing this. Its ownership check is implicitly done by the
   * constraint check on `mint_authority_acc`.
   */
  lock: PublicKey
  mintAuthorityAcc: PublicKey
  mintAuthority: PublicKey
  toTokenAcc: PublicKey
  mint: PublicKey
  tokenProgram: PublicKey
  mintLockProgram: PublicKey
}

export const layout = borsh.struct([
  borsh.u64("amount"),
  borsh.u8("authorityBump"),
])

export function mint(args: MintArgs, accounts: MintAccounts) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.lock, isSigner: false, isWritable: false },
    { pubkey: accounts.mintAuthorityAcc, isSigner: false, isWritable: true },
    { pubkey: accounts.mintAuthority, isSigner: false, isWritable: false },
    { pubkey: accounts.toTokenAcc, isSigner: false, isWritable: true },
    { pubkey: accounts.mint, isSigner: false, isWritable: true },
    { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.mintLockProgram, isSigner: false, isWritable: false },
  ]
  const identifier = Buffer.from([51, 57, 225, 47, 182, 146, 137, 166])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      amount: args.amount,
      authorityBump: args.authorityBump,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
