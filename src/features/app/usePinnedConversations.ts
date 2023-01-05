import { useQueries } from '@tanstack/react-query';
import {
  EthAddress,
  Conversation,
  isMessage,
  isSameConversation,
  isConversation,
} from '../../lib';
import {
  QueryContext,
  useXmtpClient,
  useConversationStream,
  useWorkerQueryClient,
  useReadValue,
  XmtpWorkerQueryResult,
} from '../core';

export interface UsePinnedConversationsProps {
  clientAddress?: EthAddress | null;
  stream?: boolean;
}

export interface UsePinnedConversationsResult {
  data: Conversation[] | null | undefined;
  isLoading: boolean;
  isError: boolean;
  isWaiting: boolean;
  isFetching: boolean;
}

export const usePinnedConversations = ({
  clientAddress,
  stream,
}: UsePinnedConversationsProps): UsePinnedConversationsResult => {
  const workerQueryClient = useWorkerQueryClient();

  useConversationStream({
    clientAddress,
    listener: () => {
      if (stream === false) {
        return;
      } else {
        workerQueryClient.invalidateQueries(['conversations', clientAddress]);
      }
    },
  });

  const client = useXmtpClient({ clientAddress });

  const conversationsQuery = usePinnedConversationsValue({ clientAddress });

  const messagesQueries = useQueries({
    queries: (() => {
      if (
        conversationsQuery.data === null ||
        conversationsQuery.data === undefined
      ) {
        return [];
      } else {
        return conversationsQuery.data.map((conversation) => {
          return {
            // TODO Get this key to play nice with the other fetch message queries.
            queryKey: [
              'messages',
              clientAddress,
              conversation.peerAddress,
              conversation.context?.conversationId,
            ],
            // TODO make sure this is descending order.
            queryFn: () => {
              if (client.data === null || client.data === undefined) {
                throw new Error(
                  'usePinnedConversations :: client is null or undefined'
                );
              } else {
                return client.data.fetchMessages(conversation, { limit: 1 });
              }
            },
          };
        });
      }
    })(),
    context: QueryContext,
  });

  const isWaiting = conversationsQuery.isWaiting;
  const isLoading =
    conversationsQuery.isLoading || messagesQueries.some((m) => m.isLoading);
  const isError =
    conversationsQuery.isError || messagesQueries.some((m) => m.isError);
  const isFetching =
    conversationsQuery.isFetching || messagesQueries.some((m) => m.isFetching);

  const data = (() => {
    const conversations = conversationsQuery.data;
    if (conversations === null || conversations === undefined) {
      return conversations;
    } else if (conversations.length === 0) {
      return [];
    } else {
      if (messagesQueries.some((message) => message.isLoading)) {
        return undefined;
      } else {
        return messagesQueries
          .filter((messages) => {
            if (messages.data === null || messages.data === undefined) {
              console.warn(
                'usePinnedConversation :: messages.data is null or undefined even though none of the messages queries are loading'
              );
              return false;
            } else {
              return isMessage(messages.data[0]);
            }
          })
          .map((messages) => {
            const last = (() => {
              if (messages.data === null || messages.data === undefined) {
                throw new Error(
                  'usePinnedConversations :: messages.data is null or undefined even though we already filtered out the ones that are null or undefined'
                );
              } else {
                return messages.data[0];
              }
            })();
            if (!isMessage(last)) {
              console.warn(
                'usePinnedConversations :: last is not a message:',
                last
              );
              throw new Error(
                'usePinnedConversations :: messages.data[0] from message query is not a message even though we already filtered out the ones that are not messages'
              );
            } else {
              return last;
            }
          })
          .sort((a, b) => {
            return a.sent.getTime() < b.sent.getTime() ? 1 : -1;
          })
          .map((message) => {
            const conversation = conversations.find((conversation) =>
              isSameConversation(conversation, message.conversation)
            );
            if (conversation === undefined) {
              throw new Error(
                'usePinnedConversations :: conversation is undefined even though we fetched messages using the conversation'
              );
            } else {
              return conversation;
            }
          });
      }
    }
  })();

  return {
    isWaiting,
    isLoading,
    isError,
    isFetching,
    data,
  };
};

export const usePinnedConversationsValue = ({
  clientAddress,
}: {
  clientAddress?: EthAddress | null;
}): XmtpWorkerQueryResult<Conversation[] | null> => {
  const pinnedConversations = useReadValue({
    clientAddress,
    key: 'pinned-conversations',
  });
  if (
    pinnedConversations.data === null ||
    pinnedConversations.data === undefined
  ) {
    return pinnedConversations as XmtpWorkerQueryResult<Conversation[] | null>;
  } else {
    if (
      Array.isArray(pinnedConversations.data) &&
      pinnedConversations.data.every(isConversation)
    ) {
      return {
        ...pinnedConversations,
        data: pinnedConversations.data as Conversation[],
      } as XmtpWorkerQueryResult<Conversation[]>;
    } else {
      return {
        ...pinnedConversations,
        data: [],
      } as XmtpWorkerQueryResult<Conversation[] | null>;
    }
  }
};
