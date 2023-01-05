import { QueryContext } from '..';
import { useQuery } from '@tanstack/react-query';
import { useXmtpClient } from '..';
import { EthAddress } from '../../../lib';
import { XmtpWorkerQueryResult } from '../lib';

export interface UseReadValueProps {
  clientAddress?: EthAddress | null;
  key: string;
}

export const useReadValue = ({
  clientAddress,
  key,
}: UseReadValueProps): XmtpWorkerQueryResult<unknown> => {
  const client = useXmtpClient({ clientAddress });
  const query = useQuery(
    ['key value', clientAddress, key],
    async () => {
      if (client.data === null || client.data === undefined) {
        throw new Error(
          'useKeyValue :: client is null or undefined or clientAddress is not an EthAddress'
        );
      } else {
        return (await client.data.readValue(key)) || null;
      }
    },
    {
      context: QueryContext,
      enabled: client.data !== null && client.data !== undefined,
      staleTime: Infinity,
    }
  );

  return {
    ...query,
    isWaiting: client.data === null || client.data === undefined,
  };
};
