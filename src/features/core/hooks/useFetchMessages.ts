import { useQuery } from '@tanstack/react-query';
import {
  ListMessagesOptions,
  Conversation,
  Message,
  EthAddress,
} from '../../../lib';
import { QueryContext } from '../context';
import { UseXmtpQueryResult, useXmtpClient } from './useXmtpClient';

export type UseFetchMessagesProps = {
  conversation: Conversation;
  clientAddress: EthAddress;
  opts?: Partial<ListMessagesOptions>;
};

export const useFetchMessages = ({
  conversation,
  clientAddress,
  opts,
}: UseFetchMessagesProps): UseXmtpQueryResult<Message[] | null> => {
  const client = useXmtpClient({ clientAddress });

  const query = useQuery(
    [
      'messages',
      client.data?.address,
      conversation.peerAddress,
      conversation.context?.conversationId,
    ],
    async () => {
      if (client.data === null || client.data === undefined) {
        throw new Error('useFetchMessages :: client is null or undefined');
      } else {
        return client.data.fetchMessages(conversation, opts);
      }
    },
    {
      context: QueryContext,
      enabled: client.data !== null && client.data !== undefined,
    }
  );

  return {
    ...query,
    isWaiting: client.data === null || client.data === undefined,
  };
};
