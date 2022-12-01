import { useQuery } from '@tanstack/react-query';
import { QueryContext } from '../context';
import { useXmtpClient, UseXmtpQueryResult } from './useXmtpClient';
import { Conversation, EthAddress } from '../../../lib';

export type UseFetchConversationsProps = {
  clientAddress: EthAddress;
};

export const useFetchConversations = ({
  clientAddress,
}: UseFetchConversationsProps): UseXmtpQueryResult<Conversation[] | null> => {
  const client = useXmtpClient({ clientAddress });

  const query = useQuery(
    ['conversations'],
    () => {
      if (client.data === null || client.data === undefined) {
        throw new Error('useFetchConversations :: client is null or undefined');
      } else {
        return client.data.fetchConversations();
      }
    },
    {
      context: QueryContext,
      enabled: client.data !== null && client.data !== undefined,
      staleTime: 1000 * 60 * 5,
    }
  );

  return {
    ...query,
    isWaiting: client.data === null || client.data === undefined,
  };
};
