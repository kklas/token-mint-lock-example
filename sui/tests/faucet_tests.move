#[test_only]
module examples::faucet_tests {
    use sui::test_scenario;
    use sui::balance;
    use sui::transfer;
    use sui::coin;
    use examples::treasury_lock::{Self, TreasuryLock};
    use examples::faucet::{Self, Faucet};
    use examples::example_coin::{Self, EXAMPLE_COIN};

    const COIN_ADMIN: address = @0xABBA;
    const USER: address = @0xB0B;

    #[test]
    fun test_faucet() {
        // init the coin
        let scenario = &mut test_scenario::begin(&COIN_ADMIN);
        {
            example_coin::init_for_testing(test_scenario::ctx(scenario));
        };

        // create a currency, a lock, and a faucet for it
        test_scenario::next_tx(scenario, &COIN_ADMIN);
        {
            example_coin::init_for_testing(test_scenario::ctx(scenario));
            let cap = test_scenario::take_owned<coin::TreasuryCap<EXAMPLE_COIN>>(scenario);
            let admin_cap = treasury_lock::new_lock(cap, test_scenario::ctx(scenario));

            let mint_cap = treasury_lock::create_mint_cap(&admin_cap, 500, test_scenario::ctx(scenario));
            faucet::create_faucet(mint_cap, test_scenario::ctx(scenario));

            transfer::transfer(
                admin_cap,
                COIN_ADMIN
            )
        };

        // user mints coins in the faucet
        test_scenario::next_tx(scenario, &USER);
        {
            let faucet = test_scenario::take_shared<Faucet<EXAMPLE_COIN>>(scenario);
            let lock = test_scenario::take_shared<TreasuryLock<EXAMPLE_COIN>>(scenario);

            let balance = faucet::mint_balance(
                test_scenario::borrow_mut(&mut faucet),
                test_scenario::borrow_mut(&mut lock),
                300,
                test_scenario::ctx(scenario)
            );
            assert!(balance::value<EXAMPLE_COIN>(&balance) == 300, 0);

            test_scenario::return_shared(scenario, faucet);
            test_scenario::return_shared(scenario, lock);


            transfer::transfer(
                coin::from_balance(balance, test_scenario::ctx(scenario)),
                USER
            );
        };
    }
}