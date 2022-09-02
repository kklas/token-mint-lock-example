module examples::treasury_lock {
    use sui::object::{Self, UID, ID};
    use sui::coin::{Self, TreasuryCap};
    use sui::balance::{Balance};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::vec_set::{Self, VecSet};

    /// This mint capability instance is banned.
    const EMintCapBanned: u64 = 0;
    /// Requested mint amount exceeds the per epoch mint limit.
    const EMintAmountTooLarge: u64 = 1;

    // TODO: Allow the admin to take out the trasury cap.
    struct TreasuryLock<phantom T> has key {
        id: UID,
        treasury_cap: TreasuryCap<T>,
        banned_mint_authorities: VecSet<ID>
    }

    struct LockAdminCap<phantom T> has key, store {
        id: UID
    }

    struct MintCap<phantom T> has key, store {
        id: UID,
        max_mint_per_epoch: u64,
        last_epoch: u64,
        minted_in_epoch: u64
    }

    /// Create a new treasury lock.
    public fun new_lock<T>(
        cap: TreasuryCap<T>, ctx: &mut TxContext
    ): LockAdminCap<T> {
        let lock = TreasuryLock {
            id: object::new(ctx),
            treasury_cap: cap,
            banned_mint_authorities: vec_set::empty<ID>()
        };
        transfer::share_object(lock);

        return LockAdminCap<T> {
            id: object::new(ctx),
        }
    }

    /// Create a new mint capability whose owner is allowed to mint
    /// max_mint_per_epoch coins per epoch.
    public fun create_mint_cap<T>(
        _cap: &LockAdminCap<T>, max_mint_per_epoch: u64, ctx: &mut TxContext
    ): MintCap<T> {
        MintCap<T>{
            id: object::new(ctx),
            max_mint_per_epoch,
            last_epoch: tx_context::epoch(ctx),
            minted_in_epoch: 0
        }
    }

    /// Ban a mint capability from being used.
    public fun ban_mint_cap_id<T>(
        _cap: &LockAdminCap<T>, lock: &mut TreasuryLock<T>, id: ID
    ) {
        vec_set::insert(&mut lock.banned_mint_authorities, id)
    }

    /// Unban a previously banned mint capability.
    public fun unban_mint_cap_id<T>(
        _cap: &LockAdminCap<T>, lock: &mut TreasuryLock<T>, id: ID
    ) {
        vec_set::remove(&mut lock.banned_mint_authorities, &id)
    }

    /// Borrow the TreasuryCap to be used directly.
    public fun borrow_treasury_cap<T>(
        _cap: &LockAdminCap<T>, lock: &mut TreasuryLock<T>
    ): &mut TreasuryCap<T> {
        &mut lock.treasury_cap
    }

    /// Mint a `Balance` from the locked treasury.
    public fun mint_balance<T>(
        lock: &mut TreasuryLock<T>, cap: &mut MintCap<T>, amount: u64, ctx: &mut TxContext
    ): Balance<T> {
        assert!(
            !vec_set::contains(&lock.banned_mint_authorities, object::uid_as_inner(&cap.id)),
            EMintCapBanned
        );

        let epoch = tx_context::epoch(ctx);
        if (cap.last_epoch != epoch) {
            cap.last_epoch = epoch;
            cap.minted_in_epoch = 0;
        };
        assert!(
            cap.minted_in_epoch + amount <= cap.max_mint_per_epoch,
            EMintAmountTooLarge
        );

        cap.minted_in_epoch = cap.minted_in_epoch + amount;
        coin::mint_balance(&mut lock.treasury_cap, amount)
    }
}
