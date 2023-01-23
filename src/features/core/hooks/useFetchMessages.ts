import { useQuery } from '@tanstack/react-query';
import {
  ListMessagesOptions,
  Conversation,
  Message,
  EthAddress,
} from '../../../lib';
import { QueryContext } from '../context';
import { useXmtpClient } from './useXmtpClient';
import { XmtpWorkerQueryResult } from '../lib';

export type UseFetchMessagesProps = {
  conversation: Conversation;
  clientAddress?: EthAddress | null;
  opts?: Partial<ListMessagesOptions>;
};

export const useFetchMessages = (
  props: UseFetchMessagesProps | null
): XmtpWorkerQueryResult<Message[] | null> => {
  const { conversation, clientAddress, opts } = props ?? {
    clientAddress: null,
    conversation: null,
    opts: {},
  };

  const client = useXmtpClient({ clientAddress });

  const query = useQuery(
    [
      'messages',
      client.data?.address(),
      conversation?.peerAddress,
      conversation?.context?.conversationId,
    ],
    async () => {
      if (
        client.data === null ||
        client.data === undefined ||
        conversation === null
      ) {
        throw new Error('useFetchMessages :: client is null or undefined');
      } else {
        console.log('useFetchMessages :: the query key is', [
          'messages',
          client.data?.address(),
          conversation?.peerAddress,
          conversation?.context?.conversationId,
        ]);
        return client.data.fetchMessages(conversation, opts);
      }
    },
    {
      context: QueryContext,
      enabled:
        client.data !== null &&
        client.data !== undefined &&
        conversation !== null,
    }
  );

  return {
    ...query,
    isWaiting:
      client.data === null ||
      client.data === undefined ||
      conversation === null,
  };
};
