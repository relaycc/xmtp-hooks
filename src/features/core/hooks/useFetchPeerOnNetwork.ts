import { useQuery } from '@tanstack/react-query';
import { EthAddress, isEthAddress } from '../../../lib';
import { QueryContext } from '../context';
import { useXmtpClient, UseXmtpQueryResult } from './useXmtpClient';

export const useFetchPeerOnNetwork = ({
  clientAddress,
  peerAddress,
}: {
  clientAddress: EthAddress;
  peerAddress: EthAddress | null;
}): UseXmtpQueryResult<boolean | null> => {
  const client = useXmtpClient({ clientAddress });
  const query = useQuery(
    ['peer on network', clientAddress, peerAddress],
    async () => {
      if (
        client.data === null ||
        client.data === undefined ||
        !isEthAddress(peerAddress)
      ) {
        throw new Error(
          'usePeerOnNetwork :: client is null or undefined or peerAddress is not an EthAddress'
        );
      } else {
        return client.data.fetchPeerOnNetwork(peerAddress);
      }
    },
    {
      context: QueryContext,
      enabled:
        client.data !== null &&
        client.data !== undefined &&
        isEthAddress(peerAddress),
    }
  );

  return {
    ...query,
    isWaiting:
      client.data === null ||
      client.data === undefined ||
      !isEthAddress(peerAddress),
  };
};
