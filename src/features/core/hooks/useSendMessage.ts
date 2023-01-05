import { Conversation, SendOptions, Message, EthAddress } from '../../../lib';
import { useXmtpClient } from './useXmtpClient';
import { useWorkerQueryClient } from './useWorkerQueryClient';
import { QueryContext } from '../context';
import { useMutation } from '@tanstack/react-query';

export type UseSendMessageProps = {
  clientAddress?: EthAddress | null;
  opts?: {
    onSuccess?: (message: Message | null) => unknown;
    onError?: (error: unknown) => unknown;
  };
};

export const useSendMessage = ({
  clientAddress,
  opts,
}: UseSendMessageProps) => {
  const queryClient = useWorkerQueryClient();
  const client = useXmtpClient({ clientAddress });

  return useMutation(
    async ({
      conversation,
      content,
      opts,
    }: {
      conversation: Conversation;
      content: unknown;
      opts?: Partial<SendOptions>;
    }) => {
      if (client.data === null || client.data === undefined) {
        throw new Error('useSendMessage mutationFn, client isReady = false');
      } else {
        return await client.data.sendMessage(conversation, content, opts);
      }
    },
    {
      context: QueryContext,
      onSuccess: (message) => {
        opts?.onSuccess && opts.onSuccess(message);
        queryClient.invalidateQueries([
          'messages',
          clientAddress,
          message?.conversation.peerAddress,
          message?.conversation.context?.conversationId,
        ]);
      },
      onError: (error) => {
        opts?.onError && opts.onError(error);
      },
    }
  );
};
