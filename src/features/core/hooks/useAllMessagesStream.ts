import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QueryContext } from '../context';
import { EthAddress, Message } from '../../../lib';
import { useXmtpClient } from './useXmtpClient';

export interface UseAllMessagesStreamProps {
  clientAddress?: EthAddress | null;
  listener: (message: Message) => unknown;
}

export const useAllMessagesStream = ({
  clientAddress,
  listener,
}: UseAllMessagesStreamProps) => {
  const client = useXmtpClient({ clientAddress });

  const query = useQuery(
    ['message stream', clientAddress],
    () => {
      if (client.data === null || client.data === undefined) {
        throw new Error('useAllMessageStream :: client is null or undefined');
      } else {
        return client.data.startAllMessagesStream();
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
        throw new Error('useAllMessagesStream :: client is null or undefined');
      } else {
        client.data.addListenerToAllMessagesStream(listener);
      }
    }
  }, [query.data]);
};
