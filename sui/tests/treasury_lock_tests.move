#[test_only]
module examples::treasury_lock_tests {
    use sui::test_scenario::{Self, Scenario};
    use sui::balance::{Self, Balance};
    use sui::transfer;
    use sui::coin;
    use sui::object::{Self};
    use examples::treasury_lock::{Self, TreasuryLock, LockAdminCap, MintCap, create_mint_cap, new_lock, mint_balance};
    use examples::example_coin::{Self, EXAMPLE_COIN};

    const ADMIN: address = @0xABBA;
    const USER: address = @0xB0B;

    fun user_with_mint_cap_scenario(): Scenario {
        let scenario_ = test_scenario::begin(&ADMIN);
        let scenario = &mut scenario_;

        // init the coin
        {
            example_coin::init_for_testing(test_scenario::ctx(scenario));
        };

        // create a currency and lock it
        test_scenario::next_tx(scenario, &ADMIN);
        {
            let cap = test_scenario::take_owned<coin::TreasuryCap<EXAMPLE_COIN>>(scenario);
            let admin_cap = new_lock(cap, test_scenario::ctx(scenario));
            transfer::transfer(
                admin_cap,
                ADMIN
            )
        };

        // create a mint capability and transfer it to user
        test_scenario::next_tx(scenario, &ADMIN);
        {
            let admin_cap = test_scenario::take_owned<LockAdminCap<EXAMPLE_COIN>>(scenario);
            let mint_cap = create_mint_cap(&admin_cap, 500, test_scenario::ctx(scenario));
            transfer::transfer(
                mint_cap,
                USER
            );
            test_scenario::return_owned(scenario, admin_cap);
        };

        return scenario_
    }

    fun user_mint_balance(scenario: &mut Scenario, amount: u64): Balance<EXAMPLE_COIN> {
        let mint_cap = test_scenario::take_owned<MintCap<EXAMPLE_COIN>>(scenario);
        let lock = test_scenario::take_shared<TreasuryLock<EXAMPLE_COIN>>(scenario);

        let balance = mint_balance(
            test_scenario::borrow_mut(&mut lock),
            &mut mint_cap,
            amount,
            test_scenario::ctx(scenario)
        );

        test_scenario::return_owned(scenario, mint_cap);
        test_scenario::return_shared(scenario, lock);

        return balance
    }


    #[test]
    fun test_user_can_mint() {
        let scenario = &mut user_with_mint_cap_scenario();

        // user uses its capability to mint 300 coins
        test_scenario::next_tx(scenario, &USER);
        {
            let balance = user_mint_balance(scenario, 300);
            assert!(balance::value<EXAMPLE_COIN>(&balance) == 300, 0);

            transfer::transfer(
                coin::from_balance(balance, test_scenario::ctx(scenario)),
                USER
            );
        };

    }

    #[test]
    #[expected_failure(abort_code = 1)]
    fun test_minting_over_limit_fails() {
        let scenario = &mut user_with_mint_cap_scenario();

        // mint 300 coins
        test_scenario::next_tx(scenario, &USER);
        {
            let balance = user_mint_balance(scenario, 300);
            assert!(balance::value<EXAMPLE_COIN>(&balance) == 300, 0);

            transfer::transfer(
                coin::from_balance(balance, test_scenario::ctx(scenario)),
                USER
            );
        };

        // mint 200 more
        test_scenario::next_tx(scenario, &USER);
        {
            let balance = user_mint_balance(scenario, 200);
            assert!(balance::value<EXAMPLE_COIN>(&balance) == 200, 0);

            transfer::transfer(
                coin::from_balance(balance, test_scenario::ctx(scenario)),
                USER
            );
        };

        // attempt to mint amount over the epoch limit - should fail
        test_scenario::next_tx(scenario, &USER);
        {
            let balance = user_mint_balance(scenario, 1);

            transfer::transfer(
                coin::from_balance(balance, test_scenario::ctx(scenario)),
                USER
            );
        };
    }

    #[test]
    fun test_minted_amount_resets_at_epoch_change() {
        let scenario = &mut user_with_mint_cap_scenario();

        // mint 300 coins
        test_scenario::next_tx(scenario, &USER);
        {
            let balance = user_mint_balance(scenario, 300);
            assert!(balance::value<EXAMPLE_COIN>(&balance) == 300, 0);

            transfer::transfer(
                coin::from_balance(balance, test_scenario::ctx(scenario)),
                USER
            );
        };

        // next epoch and mint 300 again
        test_scenario::next_epoch(scenario);
        test_scenario::next_tx(scenario, &USER);
        {
            let balance = user_mint_balance(scenario, 300);

            transfer::transfer(
                coin::from_balance(balance, test_scenario::ctx(scenario)),
                USER
            );
        } 
    }

    #[test]
    #[expected_failure(abort_code = 0)]
    fun test_banned_cap_cannot_mint() {
        let scenario = &mut user_with_mint_cap_scenario();

        // get the mint cap ID for reference
        test_scenario::next_tx(scenario, &USER);
        let mint_cap = test_scenario::take_owned<MintCap<EXAMPLE_COIN>>(scenario);
        let mint_cap_id = object::id(&mint_cap);
        test_scenario::return_owned(scenario, mint_cap);


        // mint 100 coins
        test_scenario::next_tx(scenario, &USER);
        {
            let balance = user_mint_balance(scenario, 100);
            assert!(balance::value<EXAMPLE_COIN>(&balance) == 100, 0);

            transfer::transfer(
                coin::from_balance(balance, test_scenario::ctx(scenario)),
                USER
            );
        };

        // admin bans mint cap
        test_scenario::next_tx(scenario, &ADMIN);
        {
            let admin_cap = test_scenario::take_owned<LockAdminCap<EXAMPLE_COIN>>(scenario);
            let lock = test_scenario::take_shared<TreasuryLock<EXAMPLE_COIN>>(scenario);

            treasury_lock::ban_mint_cap_id(
                &admin_cap,
                test_scenario::borrow_mut(&mut lock),
                mint_cap_id
            );

            test_scenario::return_owned(scenario, admin_cap);
            test_scenario::return_shared(scenario, lock);
        };

        // user attempts to mint but fails
        test_scenario::next_tx(scenario, &USER);
        {
            let balance = user_mint_balance(scenario, 100);

            transfer::transfer(
                coin::from_balance(balance, test_scenario::ctx(scenario)),
                USER
            );
        };
    }

    #[test]
    fun test_user_can_mint_after_unban() {
        let scenario = &mut user_with_mint_cap_scenario();

        // get the mint cap ID for reference
        test_scenario::next_tx(scenario, &USER);
        let mint_cap = test_scenario::take_owned<MintCap<EXAMPLE_COIN>>(scenario);
        let mint_cap_id = object::id(&mint_cap);
        test_scenario::return_owned(scenario, mint_cap);

        // mint 100 coins
        test_scenario::next_tx(scenario, &USER);
        {
            let balance = user_mint_balance(scenario, 100);
            assert!(balance::value<EXAMPLE_COIN>(&balance) == 100, 0);

            transfer::transfer(
                coin::from_balance(balance, test_scenario::ctx(scenario)),
                USER
            );
        };

        // admin bans mint cap
        test_scenario::next_tx(scenario, &ADMIN);
        {
            let admin_cap = test_scenario::take_owned<LockAdminCap<EXAMPLE_COIN>>(scenario);
            let lock = test_scenario::take_shared<TreasuryLock<EXAMPLE_COIN>>(scenario);

            treasury_lock::ban_mint_cap_id(
                &admin_cap,
                test_scenario::borrow_mut(&mut lock),
                mint_cap_id
            );

            test_scenario::return_owned(scenario, admin_cap);
            test_scenario::return_shared(scenario, lock);
        };

        // admin unbans mint cap
        test_scenario::next_tx(scenario, &ADMIN);
        {
            let admin_cap = test_scenario::take_owned<LockAdminCap<EXAMPLE_COIN>>(scenario);
            let lock = test_scenario::take_shared<TreasuryLock<EXAMPLE_COIN>>(scenario);

            treasury_lock::unban_mint_cap_id(
                &admin_cap,
                test_scenario::borrow_mut(&mut lock),
                mint_cap_id
            );

            test_scenario::return_owned(scenario, admin_cap);
            test_scenario::return_shared(scenario, lock);
        };

        // user can mint
        test_scenario::next_tx(scenario, &USER);
        {
            let balance = user_mint_balance(scenario, 100);
            assert!(balance::value<EXAMPLE_COIN>(&balance) == 100, 0);

            transfer::transfer(
                coin::from_balance(balance, test_scenario::ctx(scenario)),
                USER
            );
        };
    }
}