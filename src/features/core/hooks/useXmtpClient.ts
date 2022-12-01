import { useWorkerClient } from './useWorkerClient';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QueryContext } from '../context';
import { EthAddress } from '../../../lib';

export type UseXmtpQueryResult<T> = UseQueryResult<T, unknown> & {
  isWaiting: boolean;
};

export interface UseXmtpClientProps {
  clientAddress: EthAddress;
}

export const useXmtpClient = ({ clientAddress }: UseXmtpClientProps) => {
  const workerClient = useWorkerClient();

  return useQuery(
    ['xmtp client', clientAddress],
    async () => {
      if (workerClient === null) {
        throw new Error(
          'useXmtpClient :: clientAddress is not an EthAddress or workerClient is null'
        );
      } else {
        return await workerClient.fetchClient({ clientAddress });
      }
    },
    {
      context: QueryContext,
      enabled: workerClient !== null,
      staleTime: Infinity,
    }
  );
};
