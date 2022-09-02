use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use token_mint_lock::{MintAuthority, program::TokenMintLock, cpi::mint_to, cpi::accounts::MintTo};

declare_id!("9q3r2o4iRba85gDErhT7vNp5qGfzf92GnEiv823x8ozZ");

#[program]
pub mod faucet {
    use super::*;

    pub fn mint(ctx: Context<MintCtx>, amount: u64, authority_bump: u8) -> Result<()> {
        // do a CPI call into the mint lock program to mint tokens
        let mint_authority_acc_key = ctx.accounts.mint_authority_acc.key();
        let signer: &[&[&[u8]]] = &[&[
            mint_authority_acc_key.as_ref(),
            &[authority_bump]
        ]];
        let tx_ctx = CpiContext::new_with_signer(
            ctx.accounts.mint_lock_program.to_account_info(),
            MintTo {
                lock: ctx.accounts.lock.to_account_info(),
                mint_authority_acc: ctx.accounts.mint_authority_acc.to_account_info(),
                mint_authority: ctx.accounts.mint_authority.to_account_info(),
                to_token_acc: ctx.accounts.to_token_acc.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info()
            },
            signer
        );
        mint_to(tx_ctx, amount)?;

        Ok(())
    }
}

// Note this contract doesn't need state because it's authority to mint is contained in the PDA

#[derive(Accounts)]
#[instruction(amount: u64, authority_bump: u8)]
pub struct MintCtx<'info> {
    /// CHECK: this account is used only to pass onto the CPI call so we save ourselves a few
    /// compute units by not deserializing it. Its ownership check is implicitly done by the
    /// constraint check on `mint_authority_acc`.
    lock: AccountInfo<'info>,
    #[account(
        mut,
        constraint = mint_authority_acc.lock == lock.key()
    )]
    mint_authority_acc: Account<'info, MintAuthority>,
    #[account(
        seeds = [
            mint_authority_acc.key().as_ref()
        ],
        bump = authority_bump,
        address = mint_authority_acc.authority
    )]
    mint_authority: SystemAccount<'info>,

    #[account(mut)]
    to_token_acc: Account<'info, TokenAccount>,
    #[account(mut)]
    mint: Account<'info, Mint>,
    
    token_program: Program<'info, Token>,
    mint_lock_program: Program<'info, TokenMintLock>
}
