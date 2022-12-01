import { QueryContext } from '..';
import { useQuery } from '@tanstack/react-query';
import { useXmtpClient } from '..';
import { EthAddress } from '../../../lib';

export interface UseReadValueProps {
  clientAddress: EthAddress;
  key: string;
}

export const useReadValue = ({ clientAddress, key }: UseReadValueProps) => {
  const client = useXmtpClient({ clientAddress });
  return useQuery(
    ['key value', clientAddress, key],
    async () => {
      if (client.data === null || client.data === undefined) {
        throw new Error(
          'useKeyValue :: client is null or undefined or clientAddress is not an EthAddress'
        );
      } else {
        console.log('here');
        return (await client.data.readValue(key)) || null;
      }
    },
    {
      context: QueryContext,
      enabled: client.data !== null && client.data !== undefined,
      staleTime: Infinity,
    }
  );
};
