import { PublicKey, Connection } from "@solana/web3.js"
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface MintAuthorityFields {
  lock: PublicKey
  authority: PublicKey
  maxMintPerDay: BN
  isEnabled: boolean
  mintedToday: BN
  lastDaysSinceUnixEpoch: number
}

export interface MintAuthorityJSON {
  lock: string
  authority: string
  maxMintPerDay: string
  isEnabled: boolean
  mintedToday: string
  lastDaysSinceUnixEpoch: number
}

export class MintAuthority {
  readonly lock: PublicKey
  readonly authority: PublicKey
  readonly maxMintPerDay: BN
  readonly isEnabled: boolean
  readonly mintedToday: BN
  readonly lastDaysSinceUnixEpoch: number

  static readonly discriminator = Buffer.from([
    148, 0, 219, 228, 254, 237, 76, 128,
  ])

  static readonly layout = borsh.struct([
    borsh.publicKey("lock"),
    borsh.publicKey("authority"),
    borsh.u64("maxMintPerDay"),
    borsh.bool("isEnabled"),
    borsh.u64("mintedToday"),
    borsh.u32("lastDaysSinceUnixEpoch"),
  ])

  constructor(fields: MintAuthorityFields) {
    this.lock = fields.lock
    this.authority = fields.authority
    this.maxMintPerDay = fields.maxMintPerDay
    this.isEnabled = fields.isEnabled
    this.mintedToday = fields.mintedToday
    this.lastDaysSinceUnixEpoch = fields.lastDaysSinceUnixEpoch
  }

  static async fetch(
    c: Connection,
    address: PublicKey
  ): Promise<MintAuthority | null> {
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
  ): Promise<Array<MintAuthority | null>> {
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

  static decode(data: Buffer): MintAuthority {
    if (!data.slice(0, 8).equals(MintAuthority.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = MintAuthority.layout.decode(data.slice(8))

    return new MintAuthority({
      lock: dec.lock,
      authority: dec.authority,
      maxMintPerDay: dec.maxMintPerDay,
      isEnabled: dec.isEnabled,
      mintedToday: dec.mintedToday,
      lastDaysSinceUnixEpoch: dec.lastDaysSinceUnixEpoch,
    })
  }

  toJSON(): MintAuthorityJSON {
    return {
      lock: this.lock.toString(),
      authority: this.authority.toString(),
      maxMintPerDay: this.maxMintPerDay.toString(),
      isEnabled: this.isEnabled,
      mintedToday: this.mintedToday.toString(),
      lastDaysSinceUnixEpoch: this.lastDaysSinceUnixEpoch,
    }
  }

  static fromJSON(obj: MintAuthorityJSON): MintAuthority {
    return new MintAuthority({
      lock: new PublicKey(obj.lock),
      authority: new PublicKey(obj.authority),
      maxMintPerDay: new BN(obj.maxMintPerDay),
      isEnabled: obj.isEnabled,
      mintedToday: new BN(obj.mintedToday),
      lastDaysSinceUnixEpoch: obj.lastDaysSinceUnixEpoch,
    })
  }
}
