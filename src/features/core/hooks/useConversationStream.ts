import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QueryContext } from '../context';
import { Conversation, EthAddress } from '../../../lib';
import { useXmtpClient } from './useXmtpClient';

export interface UseConversationStreamProps {
  clientAddress: EthAddress;
  listener: (conversation: Conversation) => unknown;
}

export const useConversationStream = ({
  clientAddress,
  listener,
}: UseConversationStreamProps) => {
  const client = useXmtpClient({ clientAddress });

  const query = useQuery(
    ['conversation stream', clientAddress],
    () => {
      if (client.data === null || client.data === undefined) {
        throw new Error('useConversationStream :: client is null or undefined');
      } else {
        return client.data.startConversationStream();
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
        throw new Error('useConversationStream :: client is null or undefined');
      } else {
        client.data.addListenerToConversationStream(listener);
      }
    }
  }, [query.data]);
};
