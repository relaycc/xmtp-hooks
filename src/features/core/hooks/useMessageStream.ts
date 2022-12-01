import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QueryContext } from '../context';
import { Conversation, EthAddress, Message } from '../../../lib';
import { useXmtpClient } from './useXmtpClient';

export interface UseMessageStreamProps {
  clientAddress: EthAddress;
  conversation: Conversation;
  listener: (message: Message) => unknown;
}

export const useMessageStream = ({
  clientAddress,
  conversation,
  listener,
}: UseMessageStreamProps) => {
  const client = useXmtpClient({ clientAddress });

  const query = useQuery(
    [
      'message stream',
      clientAddress,
      conversation.peerAddress,
      conversation.context?.conversationId,
    ],
    () => {
      if (client.data === null || client.data === undefined) {
        throw new Error('useMessageStream :: client is null or undefined');
      } else {
        return client.data.startMessageStream(conversation);
      }
    },
    {
      context: QueryContext,
      enabled: client.data !== null && client.data !== undefined,
    }
  );

  useEffect(() => {
    if (query.data === true) {
      if (client.data === null || client.data === undefined) {
        throw new Error('useMessageStream :: client is null or undefined');
      } else {
        client.data.addListenerToMessageStream(conversation, listener);
      }
    }
  }, [query.data]);
};
