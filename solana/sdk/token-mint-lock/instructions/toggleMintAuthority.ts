import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface ToggleMintAuthorityArgs {
  isEnabled: boolean
}

export interface ToggleMintAuthorityAccounts {
  lock: PublicKey
  lockAdmin: PublicKey
  mintAuthorityAcc: PublicKey
}

export const layout = borsh.struct([borsh.bool("isEnabled")])

/** enable or disable mint authority */
export function toggleMintAuthority(
  args: ToggleMintAuthorityArgs,
  accounts: ToggleMintAuthorityAccounts
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.lock, isSigner: false, isWritable: false },
    { pubkey: accounts.lockAdmin, isSigner: true, isWritable: false },
    { pubkey: accounts.mintAuthorityAcc, isSigner: false, isWritable: true },
  ]
  const identifier = Buffer.from([61, 90, 179, 180, 148, 129, 198, 110])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      isEnabled: args.isEnabled,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
