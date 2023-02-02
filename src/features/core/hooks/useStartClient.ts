import { QueryContext } from '../context';
import { Wallet, ClientOptions } from '../../../lib';
import { XmtpClient } from '../lib';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkerClient } from './useWorkerClient';
import { Signer } from '@ethersproject/abstract-signer';
import { ContentCodec } from '@relaycc/xmtp-js';

export interface UseStartClientProps {
  onSuccess?: (client: XmtpClient | null) => unknown;
  onError?: (error: unknown) => unknown;
  codecs?: ContentCodec<unknown>[];
}

export const useStartClient = ({
  onSuccess,
  onError,
  codecs,
}: UseStartClientProps) => {
  const queryClient = useQueryClient({ context: QueryContext });
  const worker = useWorkerClient();

  return useMutation(
    async ({
      wallet,
      opts,
    }: {
      wallet: Signer | Wallet;
      opts?: Partial<ClientOptions>;
    }) => {
      if (worker === null) {
        throw new Error(
          'useStartClient mutationFn, workerClient isReady = false'
        );
      } else {
        await worker.addCodec(...(codecs ?? []));
        return await worker.startClient(wallet, opts);
      }
    },
    {
      context: QueryContext,
      onSuccess: (client) => {
        onSuccess && onSuccess(client);
        queryClient.invalidateQueries(['xmtp client', client?.address()]);
      },
      onError: (error) => {
        onError && onError(error);
      },
    }
  );
};
