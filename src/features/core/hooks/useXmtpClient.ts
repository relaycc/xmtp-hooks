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
        return await workerClient.fetchClient({ clientAddress });
      }
    },
    {
      context: QueryContext,
      enabled: workerClient !== null && isEthAddress(clientAddress),
      staleTime: Infinity,
    }
  );

  return {
    isWaiting: !isEthAddress(clientAddress),
    ...query,
  };
};
