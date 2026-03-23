import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';

// Create a unified pera wallet instance
const peraWallet = new PeraWalletConnect();

interface WalletContextType {
  accountAddress: string | null;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  peraWallet: PeraWalletConnect;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const isConnected = !!accountAddress;

  useEffect(() => {
    // Reconnect to the session when the component is mounted
    peraWallet
      .reconnectSession()
      .then((accounts) => {
        // Setup the disconnect event listener
        peraWallet.connector?.on('disconnect', handleDisconnectWalletClick);
        if (accounts.length) {
          setAccountAddress(accounts[0]);
        }
      })
      .catch((e) => console.log(e));
  }, []);

  const connectWallet = async () => {
    try {
      const newAccounts = await peraWallet.connect();
      // Setup the disconnect event listener
      peraWallet.connector?.on('disconnect', handleDisconnectWalletClick);
      setAccountAddress(newAccounts[0]);
    } catch (error: unknown) {
      if ((error as any)?.data?.type !== 'CONNECT_MODAL_CLOSED') {
        console.log(error);
      }
    }
  };

  const disconnectWallet = () => {
    peraWallet.disconnect();
    setAccountAddress(null);
  };

  const handleDisconnectWalletClick = () => {
    setAccountAddress(null);
  };

  return (
    <WalletContext.Provider
      value={{
        accountAddress,
        isConnected,
        connectWallet,
        disconnectWallet,
        peraWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
