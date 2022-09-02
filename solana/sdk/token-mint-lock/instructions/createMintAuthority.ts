import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface CreateMintAuthorityArgs {
  authority: PublicKey
  maxMintPerDay: BN
  isEnabled: boolean
}

export interface CreateMintAuthorityAccounts {
  lock: PublicKey
  lockAdmin: PublicKey
  mintAuthorityAcc: PublicKey
  payer: PublicKey
  systemProgram: PublicKey
}

export const layout = borsh.struct([
  borsh.publicKey("authority"),
  borsh.u64("maxMintPerDay"),
  borsh.bool("isEnabled"),
])

export function createMintAuthority(
  args: CreateMintAuthorityArgs,
  accounts: CreateMintAuthorityAccounts
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.lock, isSigner: false, isWritable: false },
    { pubkey: accounts.lockAdmin, isSigner: true, isWritable: false },
    { pubkey: accounts.mintAuthorityAcc, isSigner: true, isWritable: true },
    { pubkey: accounts.payer, isSigner: true, isWritable: true },
    { pubkey: accounts.systemProgram, isSigner: false, isWritable: false },
  ]
  const identifier = Buffer.from([26, 60, 148, 53, 106, 246, 196, 72])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      authority: args.authority,
      maxMintPerDay: args.maxMintPerDay,
      isEnabled: args.isEnabled,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
