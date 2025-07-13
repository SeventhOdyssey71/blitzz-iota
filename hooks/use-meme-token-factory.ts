import { useCallback, useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@iota/dapp-kit';
import { TransactionBlock } from '@iota/iota-sdk/transactions';
import { IotaClient } from '@iota/iota-sdk/client';
import { toast } from 'sonner';
import { MemeTokenFactory, CREATION_FEE, TokenInfo, BondingCurveInfo } from '@/lib/contracts/meme-token-factory';
import { useIotaClient } from '@iota/dapp-kit';

export function useMemeTokenFactory() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const client = useIotaClient();
  const [isLoading, setIsLoading] = useState(false);
  
  const factory = new MemeTokenFactory(client);

  // Create a new token
  const createToken = useCallback(async (
    symbol: string,
    name: string,
    description: string,
    imageUrl: string,
    onSuccess?: (curveId: string) => void
  ) => {
    if (!currentAccount) {
      toast.error('Please connect your wallet');
      return;
    }

    // Check if platform ID is set
    const { PLATFORM_ID } = await import('@/lib/contracts/meme-token-factory');
    if (!PLATFORM_ID) {
      toast.error('Launchpad contracts are not deployed yet. Please try again later.');
      return;
    }

    setIsLoading(true);
    
    try {
      const tx = new TransactionBlock();
      
      // Split coins for payment
      const [payment] = tx.splitCoins(tx.gas, [tx.pure(CREATION_FEE)]);
      
      // Create witness for new token type
      // In practice, this would need to be generated uniquely for each token
      const witness = {
        type: `${currentAccount.address}::${symbol.toLowerCase()}::${symbol.toUpperCase()}`,
      };
      
      // Create the token
      const curveId = await factory.createToken(
        tx,
        witness,
        payment,
        symbol,
        name,
        description,
        imageUrl
      );
      
      // Execute transaction
      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            // Extract bonding curve ID from events or object changes
            const bondingCurveId = result.objectChanges?.find(
              (change: any) => change.type === 'created' && change.objectType?.includes('BondingCurve')
            )?.objectId;
            
            toast.success(`Token ${symbol} created successfully!`);
            onSuccess?.(bondingCurveId || '');
            setIsLoading(false);
          },
          onError: (error) => {
            console.error('Transaction error:', error);
            toast.error(error.message || 'Failed to create token');
            setIsLoading(false);
          },
        }
      );
    } catch (error: any) {
      console.error('Error creating token:', error);
      toast.error(error.message || 'Failed to create token');
      setIsLoading(false);
    }
  }, [currentAccount, signAndExecuteTransaction, factory]);

  // Buy tokens
  const buyTokens = useCallback(async (
    tokenType: string,
    bondingCurveId: string,
    iotaAmount: bigint,
    minTokensOut: bigint = 0n,
    onSuccess?: () => void
  ) => {
    if (!currentAccount) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsLoading(true);
    
    try {
      const tx = new TransactionBlock();
      
      // Split coins for payment
      const [payment] = tx.splitCoins(tx.gas, [tx.pure(iotaAmount.toString())]);
      
      // Buy tokens
      const tokens = await factory.buyTokens(
        tx,
        tokenType,
        bondingCurveId,
        payment,
        minTokensOut
      );
      
      // Transfer tokens to sender
      tx.transferObjects([tokens], tx.pure(currentAccount.address));
      
      // Execute transaction
      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            toast.success('Tokens purchased successfully!');
            onSuccess?.();
            setIsLoading(false);
          },
          onError: (error) => {
            console.error('Transaction error:', error);
            toast.error(error.message || 'Failed to buy tokens');
            setIsLoading(false);
          },
        }
      );
    } catch (error: any) {
      console.error('Error buying tokens:', error);
      toast.error(error.message || 'Failed to buy tokens');
      setIsLoading(false);
    }
  }, [currentAccount, signAndExecuteTransaction, factory]);

  // Sell tokens
  const sellTokens = useCallback(async (
    tokenType: string,
    bondingCurveId: string,
    tokenObjectId: string,
    minIotaOut: bigint = 0n,
    onSuccess?: () => void
  ) => {
    if (!currentAccount) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsLoading(true);
    
    try {
      const tx = new TransactionBlock();
      
      // Sell tokens
      const iota = await factory.sellTokens(
        tx,
        tokenType,
        bondingCurveId,
        tx.object(tokenObjectId),
        minIotaOut
      );
      
      // Transfer IOTA to sender
      tx.transferObjects([iota], tx.pure(currentAccount.address));
      
      // Execute transaction
      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            toast.success('Tokens sold successfully!');
            onSuccess?.();
            setIsLoading(false);
          },
          onError: (error) => {
            console.error('Transaction error:', error);
            toast.error(error.message || 'Failed to sell tokens');
            setIsLoading(false);
          },
        }
      );
    } catch (error: any) {
      console.error('Error selling tokens:', error);
      toast.error(error.message || 'Failed to sell tokens');
      setIsLoading(false);
    }
  }, [currentAccount, signAndExecuteTransaction, factory]);

  // Get bonding curve info
  const getBondingCurveInfo = useCallback(async (bondingCurveId: string): Promise<BondingCurveInfo | null> => {
    try {
      return await factory.getBondingCurveInfo(bondingCurveId);
    } catch (error) {
      console.error('Error fetching bonding curve info:', error);
      return null;
    }
  }, [factory]);

  // Calculate token amounts
  const calculateTokensOut = useCallback((
    iotaAmount: bigint,
    iotaReserve: bigint,
    tokenReserve: bigint
  ): bigint => {
    return factory.calculateTokensOut(iotaAmount, iotaReserve, tokenReserve);
  }, [factory]);

  const calculateIotaOut = useCallback((
    tokenAmount: bigint,
    iotaReserve: bigint,
    tokenReserve: bigint
  ): bigint => {
    return factory.calculateIotaOut(tokenAmount, iotaReserve, tokenReserve);
  }, [factory]);

  // Format helpers
  const formatTokenAmount = useCallback((amount: string | bigint, decimals?: number): string => {
    return factory.formatTokenAmount(amount, decimals);
  }, [factory]);

  const parseTokenAmount = useCallback((amount: string, decimals?: number): bigint => {
    return factory.parseTokenAmount(amount, decimals);
  }, [factory]);

  return {
    createToken,
    buyTokens,
    sellTokens,
    getBondingCurveInfo,
    calculateTokensOut,
    calculateIotaOut,
    formatTokenAmount,
    parseTokenAmount,
    isLoading,
  };
}