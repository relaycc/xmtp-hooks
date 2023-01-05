import { Client as XmtpClient, ClientOptions } from '@relaycc/xmtp-js';
import { EthAddress, isEthAddress } from './eth';

export interface Client {
  address: EthAddress;
  // Non-canonical field.
  env: 'dev' | 'production';
}

export const isClient = (value: unknown): value is Client => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const client = value as Client;
  if (!isEthAddress(client.address)) {
    return false;
  }
  if (client.env !== 'dev' && client.env !== 'production') {
    return false;
  }
  return true;
};

export const fromXmtpClient = (
  client: XmtpClient,
  opts?: Partial<ClientOptions>
): Client => {
  if (!isEthAddress(client.address)) {
    throw new Error('Invalid client address');
  } else {
    return {
      address: client.address,
      env: (() => {
        if (opts === undefined) {
          return 'dev';
        } else {
          if (opts.env === 'production') {
            return 'production';
          } else {
            return 'dev';
          }
        }
      })(),
    };
  }
};
