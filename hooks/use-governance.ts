'use client';

import { useState, useCallback, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from '@iota/dapp-kit';
import { Transaction } from '@iota/iota-sdk/transactions';
import { toast } from 'sonner';
import { blitz_PACKAGE_ID } from '@/config/iota.config';

interface ProposalAction {
  actionType: number;
  target?: string;
  amount?: string;
  data: string;
}

interface CreateProposalParams {
  daoId: string;
  title: string;
  description: string;
  actions: ProposalAction[];
}

interface VoteParams {
  proposalId: string;
  choice: boolean; // true = yes, false = no
}

interface GovernanceStats {
  totalVotingPower: string;
  proposalCount: number;
  treasuryBalance: string;
  votingPeriod: number;
  executionDelay: number;
}

export function useGovernance() {
  const client = useIotaClient();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [isLoading, setIsLoading] = useState(false);
  const [userVotingPower, setUserVotingPower] = useState('0');
  const [governanceStats, setGovernanceStats] = useState<GovernanceStats | null>(null);

  const createProposal = useCallback(async (params: CreateProposalParams) => {
    if (!currentAccount?.address) {
      toast.error('Please connect your wallet');
      return { success: false, error: 'Wallet not connected' };
    }

    setIsLoading(true);

    try {
      const packageId = blitz_PACKAGE_ID.testnet;
      const tx = new Transaction();

      // Create proposal
      tx.moveCall({
        target: `${packageId}::governance::create_proposal`,
        arguments: [
          tx.object(params.daoId),
          tx.object('USER_GOVERNANCE_CAP'), // User's governance capability
          tx.pure(params.title),
          tx.pure(params.description),
          tx.pure(JSON.stringify(params.actions)),
          tx.object('0x6'), // Clock object
        ],
      });

      tx.setGasBudget(100000000);

      return new Promise((resolve) => {
        signAndExecuteTransaction(
          {
            transaction: tx,
            options: {
              showEffects: true,
              showEvents: true,
              showObjectChanges: true,
            },
          },
          {
            onSuccess: (result) => {
              if (result.effects?.status !== 'success') {
                const errorMsg = (result.effects as any)?.status?.error || 'Failed to create proposal';
                toast.error('Proposal creation failed', { description: errorMsg });
                resolve({ success: false, error: errorMsg });
                return;
              }

              // Extract proposal ID from events
              const proposalId = (result as any).objectChanges?.find(
                (change: any) => change.type === 'created' && 
                change.objectType?.includes('::governance::Proposal')
              )?.objectId;

              toast.success('Proposal created successfully!', {
                description: `Proposal ID: ${proposalId?.slice(0, 10)}...`,
              });

              resolve({
                success: true,
                digest: result.digest,
                proposalId,
              });
            },
            onError: (error) => {
              const errorMessage = error?.message || 'Transaction failed';
              toast.error('Proposal creation failed', { description: errorMessage });
              resolve({ success: false, error: errorMessage });
            },
          }
        );
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Proposal creation failed', { description: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, signAndExecuteTransaction]);

  const vote = useCallback(async (params: VoteParams) => {
    if (!currentAccount?.address) {
      toast.error('Please connect your wallet');
      return { success: false, error: 'Wallet not connected' };
    }

    setIsLoading(true);

    try {
      const packageId = blitz_PACKAGE_ID.testnet;
      const tx = new Transaction();

      // Cast vote
      tx.moveCall({
        target: `${packageId}::governance::vote`,
        arguments: [
          tx.object(params.proposalId),
          tx.object('USER_GOVERNANCE_CAP'), // User's governance capability
          tx.pure.bool(params.choice),
          tx.object('0x6'), // Clock object
        ],
      });

      tx.setGasBudget(50000000);

      return new Promise((resolve) => {
        signAndExecuteTransaction(
          {
            transaction: tx,
            options: {
              showEffects: true,
              showEvents: true,
            },
          },
          {
            onSuccess: (result) => {
              if (result.effects?.status !== 'success') {
                const errorMsg = (result.effects as any)?.status?.error || 'Failed to cast vote';
                toast.error('Voting failed', { description: errorMsg });
                resolve({ success: false, error: errorMsg });
                return;
              }

              toast.success(`Vote cast: ${params.choice ? 'YES' : 'NO'}`, {
                description: `Transaction: ${result.digest.slice(0, 10)}...`,
              });

              resolve({
                success: true,
                digest: result.digest,
              });
            },
            onError: (error) => {
              const errorMessage = error?.message || 'Transaction failed';
              let description = errorMessage;

              if (errorMessage.includes('AlreadyVoted')) {
                description = 'You have already voted on this proposal';
              } else if (errorMessage.includes('ProposalNotActive')) {
                description = 'Voting period has ended';
              }

              toast.error('Voting failed', { description });
              resolve({ success: false, error: errorMessage });
            },
          }
        );
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Voting failed', { description: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, signAndExecuteTransaction]);

  const executeProposal = useCallback(async (proposalId: string) => {
    if (!currentAccount?.address) {
      toast.error('Please connect your wallet');
      return { success: false, error: 'Wallet not connected' };
    }

    setIsLoading(true);

    try {
      const packageId = blitz_PACKAGE_ID.testnet;
      const tx = new Transaction();

      // Execute proposal
      tx.moveCall({
        target: `${packageId}::governance::execute_proposal`,
        arguments: [
          tx.object('DAO_ID'), // DAO object
          tx.object(proposalId),
          tx.object('0x6'), // Clock object
        ],
      });

      tx.setGasBudget(150000000);

      return new Promise((resolve) => {
        signAndExecuteTransaction(
          {
            transaction: tx,
            options: {
              showEffects: true,
              showEvents: true,
            },
          },
          {
            onSuccess: (result) => {
              if (result.effects?.status !== 'success') {
                const errorMsg = (result.effects as any)?.status?.error || 'Failed to execute proposal';
                toast.error('Proposal execution failed', { description: errorMsg });
                resolve({ success: false, error: errorMsg });
                return;
              }

              toast.success('Proposal executed successfully!', {
                description: `Transaction: ${result.digest.slice(0, 10)}...`,
              });

              resolve({
                success: true,
                digest: result.digest,
              });
            },
            onError: (error) => {
              const errorMessage = error?.message || 'Transaction failed';
              let description = errorMessage;

              if (errorMessage.includes('ProposalNotPassed')) {
                description = 'Proposal did not receive enough votes';
              } else if (errorMessage.includes('ExecutionTimeNotReached')) {
                description = 'Execution delay period has not passed';
              } else if (errorMessage.includes('InsufficientQuorum')) {
                description = 'Insufficient voter participation';
              }

              toast.error('Proposal execution failed', { description });
              resolve({ success: false, error: errorMessage });
            },
          }
        );
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Proposal execution failed', { description: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, signAndExecuteTransaction]);

  const delegateVotingPower = useCallback(async (delegatee: string, amount: string) => {
    if (!currentAccount?.address) {
      toast.error('Please connect your wallet');
      return { success: false, error: 'Wallet not connected' };
    }

    setIsLoading(true);

    try {
      const packageId = blitz_PACKAGE_ID.testnet;
      const tx = new Transaction();

      // Create delegation transaction
      tx.moveCall({
        target: `${packageId}::governance::delegate_voting_power`,
        arguments: [
          tx.object('DAO_ID'),
          tx.pure.address(delegatee),
          tx.pure.u64(amount),
        ],
      });

      tx.setGasBudget(75000000);

      return new Promise((resolve) => {
        signAndExecuteTransaction(
          {
            transaction: tx,
            options: { showEffects: true },
          },
          {
            onSuccess: (result) => {
              toast.success(`Delegated ${amount} voting power to ${delegatee.slice(0, 10)}...`);
              resolve({ success: true, digest: result.digest });
            },
            onError: (error) => {
              toast.error('Delegation failed', { description: error?.message });
              resolve({ success: false, error: error?.message });
            },
          }
        );
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, signAndExecuteTransaction]);

  // Fetch user's voting power
  useEffect(() => {
    const fetchVotingPower = async () => {
      if (!currentAccount?.address) return;

      try {
        // Query user's governance capabilities
        const ownedObjects = await client.getOwnedObjects({
          owner: currentAccount.address,
          filter: {
            StructType: `${blitz_PACKAGE_ID.testnet}::governance::GovernanceCap`
          },
          options: {
            showContent: true,
          }
        });

        let totalPower = '0';
        if (ownedObjects.data) {
          for (const obj of ownedObjects.data) {
            if (obj.data?.content?.dataType === 'moveObject') {
              const fields = obj.data.content.fields as any;
              const power = BigInt(fields.voting_power || '0');
              totalPower = (BigInt(totalPower) + power).toString();
            }
          }
        }

        setUserVotingPower(totalPower);
      } catch (error) {
        console.warn('Failed to fetch voting power:', error);
      }
    };

    fetchVotingPower();
  }, [currentAccount, client]);

  return {
    createProposal,
    vote,
    executeProposal,
    delegateVotingPower,
    userVotingPower,
    governanceStats,
    isLoading,
  };
}