/// Governance Module implementing IOTA Move's capability pattern
/// Provides decentralized governance with time-locked proposals and voting
module arva::governance {
    use std::option::{Self, Option};
    use std::vector;
    use iota::object::{Self, UID, ID};
    use iota::balance::{Self, Balance};
    use iota::coin::{Self, Coin};
    use iota::tx_context::{Self, TxContext};
    use iota::clock::{Self, Clock};
    use iota::event;
    use iota::transfer;

    /// Governance token capability
    public struct GovernanceCap has key, store {
        id: UID,
        voting_power: u64,
    }

    /// Governance DAO structure
    public struct DAO has key {
        id: UID,
        name: vector<u8>,
        treasury: Balance<arva::coin::ARVA>,
        total_voting_power: u64,
        proposal_threshold: u64,  // Minimum tokens needed to create proposal
        voting_period: u64,       // Duration in milliseconds
        execution_delay: u64,     // Time-lock delay for execution
        quorum_threshold: u64,    // Minimum participation for valid vote
        proposals: vector<ID>,
    }

    /// Proposal structure
    public struct Proposal has key {
        id: UID,
        proposer: address,
        title: vector<u8>,
        description: vector<u8>,
        actions: vector<ProposalAction>,
        start_time: u64,
        end_time: u64,
        execution_time: u64,
        yes_votes: u64,
        no_votes: u64,
        total_votes: u64,
        executed: bool,
        cancelled: bool,
        voters: vector<address>,
    }

    /// Proposal action types
    public struct ProposalAction has store, copy, drop {
        action_type: u8,
        target: Option<address>,
        amount: Option<u64>,
        data: vector<u8>,
    }

    /// Vote record
    public struct Vote has key {
        id: UID,
        proposal_id: ID,
        voter: address,
        choice: bool,  // true = yes, false = no
        voting_power: u64,
        timestamp: u64,
    }

    /// Events
    public struct ProposalCreated has copy, drop {
        proposal_id: ID,
        proposer: address,
        title: vector<u8>,
        end_time: u64,
    }

    public struct VoteCast has copy, drop {
        proposal_id: ID,
        voter: address,
        choice: bool,
        voting_power: u64,
    }

    public struct ProposalExecuted has copy, drop {
        proposal_id: ID,
        yes_votes: u64,
        no_votes: u64,
    }

    /// Action types
    const ACTION_TREASURY_TRANSFER: u8 = 1;
    const ACTION_PARAMETER_CHANGE: u8 = 2;
    const ACTION_UPGRADE: u8 = 3;

    /// Error codes
    const E_INSUFFICIENT_VOTING_POWER: u64 = 1;
    const E_PROPOSAL_NOT_ACTIVE: u64 = 2;
    const E_ALREADY_VOTED: u64 = 3;
    const E_PROPOSAL_NOT_PASSED: u64 = 4;
    const E_EXECUTION_TIME_NOT_REACHED: u64 = 5;
    const E_PROPOSAL_ALREADY_EXECUTED: u64 = 6;
    const E_INSUFFICIENT_QUORUM: u64 = 7;

    /// Initialize DAO governance
    public fun create_dao(
        name: vector<u8>,
        initial_treasury: Coin<arva::coin::ARVA>,
        proposal_threshold: u64,
        voting_period: u64,
        execution_delay: u64,
        quorum_threshold: u64,
        ctx: &mut TxContext
    ): DAO {
        DAO {
            id: object::new(ctx),
            name,
            treasury: coin::into_balance(initial_treasury),
            total_voting_power: 0,
            proposal_threshold,
            voting_period,
            execution_delay,
            quorum_threshold,
            proposals: vector::empty(),
        }
    }

    /// Mint governance capability (typically called during token staking)
    public fun mint_governance_cap(
        dao: &mut DAO,
        voting_power: u64,
        ctx: &mut TxContext
    ): GovernanceCap {
        dao.total_voting_power = dao.total_voting_power + voting_power;
        
        GovernanceCap {
            id: object::new(ctx),
            voting_power,
        }
    }

    /// Burn governance capability (typically called during token unstaking)
    public fun burn_governance_cap(
        dao: &mut DAO,
        cap: GovernanceCap,
    ) {
        let GovernanceCap { id, voting_power } = cap;
        object::delete(id);
        
        dao.total_voting_power = dao.total_voting_power - voting_power;
    }

    /// Create a new proposal
    public fun create_proposal(
        dao: &mut DAO,
        cap: &GovernanceCap,
        title: vector<u8>,
        description: vector<u8>,
        actions: vector<ProposalAction>,
        clock: &Clock,
        ctx: &mut TxContext
    ): ID {
        // Check voting power threshold
        assert!(cap.voting_power >= dao.proposal_threshold, E_INSUFFICIENT_VOTING_POWER);

        let current_time = clock::timestamp_ms(clock);
        let end_time = current_time + dao.voting_period;
        let execution_time = end_time + dao.execution_delay;

        let proposal = Proposal {
            id: object::new(ctx),
            proposer: tx_context::sender(ctx),
            title: title,
            description,
            actions,
            start_time: current_time,
            end_time,
            execution_time,
            yes_votes: 0,
            no_votes: 0,
            total_votes: 0,
            executed: false,
            cancelled: false,
            voters: vector::empty(),
        };

        let proposal_id = object::id(&proposal);
        vector::push_back(&mut dao.proposals, proposal_id);

        event::emit(ProposalCreated {
            proposal_id,
            proposer: tx_context::sender(ctx),
            title,
            end_time,
        });

        transfer::share_object(proposal);
        proposal_id
    }

    /// Cast a vote on a proposal
    public fun vote(
        proposal: &mut Proposal,
        cap: &GovernanceCap,
        choice: bool,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        let voter = tx_context::sender(ctx);

        // Check if voting period is active
        assert!(
            current_time >= proposal.start_time && current_time <= proposal.end_time,
            E_PROPOSAL_NOT_ACTIVE
        );

        // Check if voter already voted
        assert!(!vector::contains(&proposal.voters, &voter), E_ALREADY_VOTED);

        // Record vote
        let voting_power = cap.voting_power;
        if (choice) {
            proposal.yes_votes = proposal.yes_votes + voting_power;
        } else {
            proposal.no_votes = proposal.no_votes + voting_power;
        };

        proposal.total_votes = proposal.total_votes + voting_power;
        vector::push_back(&mut proposal.voters, voter);

        // Create vote record
        let vote = Vote {
            id: object::new(ctx),
            proposal_id: object::id(proposal),
            voter,
            choice,
            voting_power,
            timestamp: current_time,
        };

        event::emit(VoteCast {
            proposal_id: object::id(proposal),
            voter,
            choice,
            voting_power,
        });

        transfer::share_object(vote);
    }

    /// Execute a passed proposal
    public fun execute_proposal(
        dao: &mut DAO,
        proposal: &mut Proposal,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);

        // Check execution conditions
        assert!(current_time >= proposal.execution_time, E_EXECUTION_TIME_NOT_REACHED);
        assert!(!proposal.executed, E_PROPOSAL_ALREADY_EXECUTED);
        assert!(proposal.yes_votes > proposal.no_votes, E_PROPOSAL_NOT_PASSED);
        assert!(proposal.total_votes >= dao.quorum_threshold, E_INSUFFICIENT_QUORUM);

        // Execute actions
        let actions = &proposal.actions;
        let i = 0;
        while (i < vector::length(actions)) {
            let action = vector::borrow(actions, i);
            execute_action(dao, action, ctx);
            i = i + 1;
        };

        proposal.executed = true;

        event::emit(ProposalExecuted {
            proposal_id: object::id(proposal),
            yes_votes: proposal.yes_votes,
            no_votes: proposal.no_votes,
        });
    }

    /// Execute a specific action
    fun execute_action(
        dao: &mut DAO,
        action: &ProposalAction,
        ctx: &mut TxContext
    ) {
        if (action.action_type == ACTION_TREASURY_TRANSFER) {
            if (option::is_some(&action.target) && option::is_some(&action.amount)) {
                let target = *option::borrow(&action.target);
                let amount = *option::borrow(&action.amount);
                
                if (balance::value(&dao.treasury) >= amount) {
                    let transfer_balance = balance::split(&mut dao.treasury, amount);
                    let transfer_coin = coin::from_balance(transfer_balance, ctx);
                    transfer::public_transfer(transfer_coin, target);
                };
            };
        }
        // Additional action types can be implemented here
    }

    /// View functions
    public fun voting_power(cap: &GovernanceCap): u64 {
        cap.voting_power
    }

    public fun proposal_status(proposal: &Proposal): (u64, u64, u64, bool, bool) {
        (proposal.yes_votes, proposal.no_votes, proposal.total_votes, proposal.executed, proposal.cancelled)
    }

    public fun dao_treasury_balance(dao: &DAO): u64 {
        balance::value(&dao.treasury)
    }

    public fun dao_parameters(dao: &DAO): (u64, u64, u64, u64) {
        (dao.proposal_threshold, dao.voting_period, dao.execution_delay, dao.quorum_threshold)
    }
}