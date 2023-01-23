import { useWorkerClient } from './useWorkerClient';
import { useQuery } from '@tanstack/react-query';
import { QueryContext } from '../context';
import { EthAddress, isEthAddress } from '../../../lib';
import { XmtpClient, XmtpWorkerQueryResult } from '../lib';

export interface UseXmtpClientProps {
  clientAddress?: EthAddress | null;
}

export const useXmtpClient = ({
  clientAddress,
}: UseXmtpClientProps): XmtpWorkerQueryResult<XmtpClient | null> => {
  const workerClient = useWorkerClient();

  const query = useQuery(
    ['xmtp client', clientAddress],
    async () => {
      if (!isEthAddress(clientAddress) || workerClient === null) {
        throw new Error(
          'useXmtpClient :: clientAddress is not an EthAddress or workerClient is null'
        );
      } else {
        console.log(
          'useXmtpClient :: Fetching query for address',
          clientAddress
        );
        const fetchedClient = await workerClient.fetchClient({ clientAddress });
        if (fetchedClient === null || fetchedClient === undefined) {
          console.log(
            'useXmtpClient :: No client found for address',
            clientAddress
          );
          return null;
        } else {
          console.log(
            'useXmtpClient :: Got a client for address',
            clientAddress
          );
          return fetchedClient;
        }
      }
    },
    {
      context: QueryContext,
      enabled: workerClient !== null && isEthAddress(clientAddress),
      staleTime: 0,
    }
  );

  return {
    isWaiting: !isEthAddress(clientAddress),
    ...query,
  };
};
