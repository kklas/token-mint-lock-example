use anchor_lang::prelude::*;
use anchor_spl::token::spl_token::instruction::AuthorityType;
use anchor_spl::token::{self, Mint, MintTo as SplMintTo, SetAuthority, Token, TokenAccount};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod token_mint_lock {
    use super::*;

    pub fn create_lock(ctx: Context<CreateLock>, lock_admin: Pubkey) -> Result<()> {
        let bump = *ctx.bumps.get("lock").unwrap();
        ctx.accounts.lock.set_inner(MintLock {
            admin: lock_admin,
            mint: ctx.accounts.mint.key(),
            bump,
        });

        // do a CPI call to set mint authority of token to this program's PDA
        let tx_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            SetAuthority {
                current_authority: ctx.accounts.mint_authority.to_account_info(),
                account_or_mint: ctx.accounts.mint.to_account_info(),
            },
        );
        token::set_authority(
            tx_ctx,
            AuthorityType::MintTokens,
            Some(ctx.accounts.lock.key()),
        )?;

        Ok(())
    }

    pub fn create_mint_authority(
        ctx: Context<CreateMintAuthority>,
        authority: Pubkey,
        max_mint_per_day: u64,
        is_enabled: bool,
    ) -> Result<()> {
        ctx.accounts.mint_authority_acc.set_inner(MintAuthority {
            lock: ctx.accounts.lock.key(),
            authority,
            max_mint_per_day,
            is_enabled,
            minted_today: 0,
            last_days_since_unix_epoch: calc_days_since_unix_epoch(),
        });

        Ok(())
    }

    /// enable or disable mint authority
    pub fn toggle_mint_authority(
        ctx: Context<ToggleMintAuthority>,
        is_enabled: bool,
    ) -> Result<()> {
        ctx.accounts.mint_authority_acc.is_enabled = is_enabled;

        Ok(())
    }

    pub fn set_lock_admin(ctx: Context<SetLockAdmin>, new_admin: Pubkey) -> Result<()> {
        ctx.accounts.lock.admin = new_admin;

        Ok(())
    }

    pub fn mint_to(ctx: Context<MintTo>, amount: u64) -> Result<()> {
        let mint_auth = &mut ctx.accounts.mint_authority_acc;

        require!(
            mint_auth.is_enabled == true,
            ErrorCode::MintAuthorityDisabled
        );

        // reset mint amount coutner if needed
        let days_since_unix_epoch = calc_days_since_unix_epoch();
        if mint_auth.last_days_since_unix_epoch != days_since_unix_epoch {
            mint_auth.last_days_since_unix_epoch = days_since_unix_epoch;
            mint_auth.minted_today = 0
        }

        require!(
            amount + mint_auth.minted_today <= mint_auth.max_mint_per_day,
            ErrorCode::MintLimitExceeded
        );

        // do a CPI call to mint tokens
        let signer: &[&[&[u8]]] = &[&[
            ctx.accounts.lock.mint.as_ref(), &[ctx.accounts.lock.bump]]];
        let tx_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            SplMintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.to_token_acc.to_account_info(),
                authority: ctx.accounts.lock.to_account_info(),
            },
            signer,
        );
        token::mint_to(tx_ctx, amount)?;

        Ok(())
    }
}

fn calc_days_since_unix_epoch() -> u32 {
    let current_ts = Clock::get().unwrap().unix_timestamp;
    let seconds_in_day = 86400;
    return (current_ts / seconds_in_day).try_into().unwrap();
}

#[account]
pub struct MintLock {
    pub mint: Pubkey,
    pub admin: Pubkey,
    pub bump: u8,
}

#[account]
pub struct MintAuthority {
    pub lock: Pubkey,
    pub authority: Pubkey,
    pub max_mint_per_day: u64,
    pub is_enabled: bool,
    pub minted_today: u64,
    pub last_days_since_unix_epoch: u32,
}

#[derive(Accounts)]
pub struct CreateLock<'info> {
    #[account(
        init,
        space = 8 + 32 + 32 + 1,
        payer = payer,
        seeds = [
            mint.key().as_ref()
        ],
        bump
    )]
    lock: Account<'info, MintLock>,

    #[account(mut)]
    mint: Account<'info, Mint>,
    #[account(
        address = mint.mint_authority.unwrap(),
    )]
    mint_authority: Signer<'info>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CreateMintAuthority<'info> {
    lock: Account<'info, MintLock>,
    #[account(address = lock.admin)]
    lock_admin: Signer<'info>,

    #[account(
        init,
        space = 8 + 32 + 32 + 8 + 1 + 8 + 4,
        payer = payer,
    )]
    mint_authority_acc: Account<'info, MintAuthority>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ToggleMintAuthority<'info> {
    lock: Account<'info, MintLock>,
    #[account(address = lock.admin)]
    lock_admin: Signer<'info>,

    #[account(
        mut,
        constraint = mint_authority_acc.lock == lock.key(),
    )]
    mint_authority_acc: Account<'info, MintAuthority>,
}

#[derive(Accounts)]
pub struct SetLockAdmin<'info> {
    #[account(mut)]
    lock: Account<'info, MintLock>,
    #[account(address = lock.admin)]
    lock_admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct MintTo<'info> {
    lock: Account<'info, MintLock>,

    #[account(
        mut,
        constraint = mint_authority_acc.lock == lock.key(),
    )]
    mint_authority_acc: Account<'info, MintAuthority>,
    #[account(
        address = mint_authority_acc.authority
    )]
    mint_authority: Signer<'info>,

    #[account(
        mut,
        constraint = to_token_acc.mint == lock.mint
    )]
    to_token_acc: Account<'info, TokenAccount>,
    #[account(
        mut,
        address = lock.mint
    )]
    mint: Account<'info, Mint>,

    token_program: Program<'info, Token>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Mint authority is disabled")]
    MintAuthorityDisabled,
    #[msg("Daily mint limit exceeded")]
    MintLimitExceeded,
}
