import { PublicKey, Connection } from "@solana/web3.js"
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface MintLockFields {
  mint: PublicKey
  admin: PublicKey
  bump: number
}

export interface MintLockJSON {
  mint: string
  admin: string
  bump: number
}

export class MintLock {
  readonly mint: PublicKey
  readonly admin: PublicKey
  readonly bump: number

  static readonly discriminator = Buffer.from([
    133, 242, 102, 52, 120, 71, 169, 14,
  ])

  static readonly layout = borsh.struct([
    borsh.publicKey("mint"),
    borsh.publicKey("admin"),
    borsh.u8("bump"),
  ])

  constructor(fields: MintLockFields) {
    this.mint = fields.mint
    this.admin = fields.admin
    this.bump = fields.bump
  }

  static async fetch(
    c: Connection,
    address: PublicKey
  ): Promise<MintLock | null> {
    const info = await c.getAccountInfo(address)

    if (info === null) {
      return null
    }
    if (!info.owner.equals(PROGRAM_ID)) {
      throw new Error("account doesn't belong to this program")
    }

    return this.decode(info.data)
  }

  static async fetchMultiple(
    c: Connection,
    addresses: PublicKey[]
  ): Promise<Array<MintLock | null>> {
    const infos = await c.getMultipleAccountsInfo(addresses)

    return infos.map((info) => {
      if (info === null) {
        return null
      }
      if (!info.owner.equals(PROGRAM_ID)) {
        throw new Error("account doesn't belong to this program")
      }

      return this.decode(info.data)
    })
  }

  static decode(data: Buffer): MintLock {
    if (!data.slice(0, 8).equals(MintLock.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = MintLock.layout.decode(data.slice(8))

    return new MintLock({
      mint: dec.mint,
      admin: dec.admin,
      bump: dec.bump,
    })
  }

  toJSON(): MintLockJSON {
    return {
      mint: this.mint.toString(),
      admin: this.admin.toString(),
      bump: this.bump,
    }
  }

  static fromJSON(obj: MintLockJSON): MintLock {
    return new MintLock({
      mint: new PublicKey(obj.mint),
      admin: new PublicKey(obj.admin),
      bump: obj.bump,
    })
  }
}
