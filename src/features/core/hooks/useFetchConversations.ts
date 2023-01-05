import { useQuery } from '@tanstack/react-query';
import { QueryContext } from '../context';
import { useXmtpClient } from './useXmtpClient';
import { XmtpWorkerQueryResult } from '../lib';
import { Conversation, EthAddress } from '../../../lib';

export type UseFetchConversationsProps = {
  clientAddress?: EthAddress | null;
};

export const useFetchConversations = ({
  clientAddress,
}: UseFetchConversationsProps): XmtpWorkerQueryResult<
  Conversation[] | null
> => {
  const client = useXmtpClient({ clientAddress });

  const query = useQuery(
    ['conversations', clientAddress],
    async () => {
      if (client.data === null || client.data === undefined) {
        throw new Error('useFetchConversations :: client is null or undefined');
      } else {
        const uniq: Record<string, Conversation> = {};
        const conversations = await client.data.fetchConversations();
        if (conversations === null) {
          return null;
        } else {
          conversations.forEach((conversation) => {
            uniq[
              conversation.peerAddress + conversation.context?.conversationId
            ] = conversation;
          });
          return Object.values(uniq);
        }
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
