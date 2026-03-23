import algosdk from 'algosdk';
import dotenv from 'dotenv';
dotenv.config();

// Connect to Algorand TestNet via public nodes (e.g., AlgoNode)
const ALGOD_SERVER = 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = '';
const ALGOD_TOKEN = '';

const INDEXER_SERVER = 'https://testnet-idx.algonode.cloud';
const INDEXER_PORT = '';
const INDEXER_TOKEN = '';

export const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
export const indexerClient = new algosdk.Indexer(INDEXER_TOKEN, INDEXER_SERVER, INDEXER_PORT);

/**
 * Validates if an address is a valid Algorand address.
 */
export const isValidAddress = (address: string): boolean => {
  return algosdk.isValidAddress(address);
};

/**
 * Dummy function to simulate creating an ASA (Asset) for an SHG Treasury.
 * In a real scenario, this would create the payload for the frontend to sign,
 * or the backend would sign it if it's the creator.
 */
export const generateAsaCreationTxn = async (creatorAddress: string, assetName: string, unitName: string) => {
  const suggestedParams = await algodClient.getTransactionParams().do();
  
  const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    sender: creatorAddress,
    total: 1000000, // 1M tokens
    decimals: 2,
    defaultFrozen: false,
    manager: creatorAddress,
    reserve: creatorAddress,
    freeze: creatorAddress,
    clawback: creatorAddress,
    unitName,
    assetName,
    assetURL: 'https://SAHELI.example.com',
    suggestedParams
  });

  return txn;
};
