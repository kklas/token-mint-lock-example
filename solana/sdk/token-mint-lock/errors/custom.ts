export type CustomError = MintAuthorityDisabled | MintLimitExceeded

export class MintAuthorityDisabled extends Error {
  static readonly code = 6000
  readonly code = 6000
  readonly name = "MintAuthorityDisabled"
  readonly msg = "Mint authority is disabled"

  constructor(readonly logs?: string[]) {
    super("6000: Mint authority is disabled")
  }
}

export class MintLimitExceeded extends Error {
  static readonly code = 6001
  readonly code = 6001
  readonly name = "MintLimitExceeded"
  readonly msg = "Daily mint limit exceeded"

  constructor(readonly logs?: string[]) {
    super("6001: Daily mint limit exceeded")
  }
}

export function fromCode(code: number, logs?: string[]): CustomError | null {
  switch (code) {
    case 6000:
      return new MintAuthorityDisabled(logs)
    case 6001:
      return new MintLimitExceeded(logs)
  }

  return null
}
