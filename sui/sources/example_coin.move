module examples::example_coin {
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, TreasuryCap};
    use sui::transfer;
    use examples::treasury_lock;
    use examples::faucet;

    /// EXAMPLE_COIN is an example token.
    struct EXAMPLE_COIN has drop {}

    /// Create the FOO currency and transfer cap to caller
    fun init(witness: EXAMPLE_COIN, ctx: &mut TxContext) {
        let cap = coin::create_currency(witness, ctx);

        transfer::transfer(
            cap,
            tx_context::sender(ctx)
        )
    }

    public entry fun create_faucet(
        cap: TreasuryCap<EXAMPLE_COIN>,
        max_mint_per_epoch: u64,
        ctx: &mut TxContext
    ) {
        let lock_cap = treasury_lock::new_lock(cap, ctx);

        let mint_cap = treasury_lock::create_mint_cap(
            &lock_cap, max_mint_per_epoch, ctx
        );
        faucet::create_faucet(mint_cap, ctx);

        transfer::transfer(
            lock_cap,
            tx_context::sender(ctx)
        )
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(EXAMPLE_COIN{}, ctx)
    }

}