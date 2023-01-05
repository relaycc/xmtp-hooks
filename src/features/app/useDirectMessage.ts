import { EthAddress, Conversation, Message } from '../../lib';
import {
  useFetchMessages,
  useMessageStream,
  useSendMessage,
  useWorkerQueryClient,
  XmtpWorkerQueryResult,
} from '../core';

export interface UseDirectMessageProps {
  clientAddress?: EthAddress | null;
  conversation: Conversation;
  stream?: boolean;
}

export interface UseDirectMessageResult {
  messages: XmtpWorkerQueryResult<Message[] | null>;
  sendMessage: ReturnType<typeof useSendMessage>;
}

export const useDirectMessage = ({
  clientAddress,
  conversation,
  stream,
}: UseDirectMessageProps): UseDirectMessageResult => {
  const messages = useFetchMessages({ clientAddress, conversation });
  const sendMessage = useSendMessage({ clientAddress });
  const workerQueryClient = useWorkerQueryClient();

  useMessageStream({
    clientAddress,
    conversation,
    listener: () => {
      // TODO - Instead of refetching, we should use the message stream to
      // update the cache
      if (stream !== false) {
        workerQueryClient.invalidateQueries([
          'messages',
          clientAddress,
          conversation.peerAddress,
          conversation.context?.conversationId,
        ]);
      }
    },
  });

  return { messages, sendMessage };
};
