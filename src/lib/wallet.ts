import { EthAddress, isEthAddress } from './eth';

export type Wallet = SignerWallet | IdentityWallet;

export interface IdentityWallet {
  address: EthAddress;
  uuid: Uint8Array;
}

export const isIdentityWallet = (wallet: unknown): wallet is IdentityWallet => {
  if (typeof wallet !== 'object' || wallet === null) {
    return false;
  }
  if (!isEthAddress((wallet as IdentityWallet).address)) {
    return false;
  }

  try {
    Uint8Array.from((wallet as IdentityWallet).uuid);
  } catch {
    return false;
  }

  return true;
};

export interface SignerWallet {
  getAddress: () => Promise<string>;
  signMessage: (message: string) => Promise<string>;
}
