module examples::faucet {
    use sui::tx_context::{Self, TxContext};
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::coin;
    use sui::balance::Balance;
    use examples::treasury_lock::{Self, MintCap, TreasuryLock};

    struct Faucet<phantom T> has key {
        id: UID,
        mint_cap: MintCap<T>
    }

    public entry fun create_faucet<T>(mint_cap: MintCap<T>, ctx: &mut TxContext) {
        let faucet = Faucet {
            id: object::new(ctx),
            mint_cap
        };
        transfer::share_object(faucet)
    }

    public fun mint_balance<T>(
        faucet: &mut Faucet<T>,
        lock: &mut TreasuryLock<T>,
        amount: u64,
        ctx: &mut TxContext
    ): Balance<T> {
        return treasury_lock::mint_balance(lock, &mut faucet.mint_cap, amount, ctx)
    }

    public entry fun mint_and_transfer<T>(
        faucet: &mut Faucet<T>,
        lock: &mut TreasuryLock<T>,
        amount: u64,
        ctx: &mut TxContext
    ) {
        transfer::transfer(
            coin::from_balance(mint_balance(faucet, lock, amount, ctx), ctx),
            tx_context::sender(ctx)
        )
    }
}
