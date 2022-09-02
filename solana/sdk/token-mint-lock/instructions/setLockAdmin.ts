import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface SetLockAdminArgs {
  newAdmin: PublicKey
}

export interface SetLockAdminAccounts {
  lock: PublicKey
  lockAdmin: PublicKey
}

export const layout = borsh.struct([borsh.publicKey("newAdmin")])

export function setLockAdmin(
  args: SetLockAdminArgs,
  accounts: SetLockAdminAccounts
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.lock, isSigner: false, isWritable: true },
    { pubkey: accounts.lockAdmin, isSigner: true, isWritable: false },
  ]
  const identifier = Buffer.from([196, 122, 174, 197, 237, 233, 129, 44])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      newAdmin: args.newAdmin,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
