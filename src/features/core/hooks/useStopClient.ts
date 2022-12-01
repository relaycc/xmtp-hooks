import { QueryContext } from '../context';
import { Client, EthAddress } from '../../../lib';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkerClient } from './useWorkerClient';

export type UseStopClientProps = {
  onSuccess?: (client: Client | null) => unknown;
  onError?: (err: unknown) => unknown;
};

export const useStopClient = ({ onSuccess, onError }: UseStopClientProps) => {
  const queryClient = useQueryClient({ context: QueryContext });
  const worker = useWorkerClient();

  return useMutation(
    async ({ clientAddress }: { clientAddress: EthAddress }) => {
      if (worker === null) {
        throw new Error(
          'useStopClient mutationFn, workerClient isReady = false'
        );
      } else {
        return await worker.stopClient({ clientAddress });
      }
    },
    {
      context: QueryContext,
      onSuccess: (client) => {
        onSuccess && onSuccess(client);
        queryClient.invalidateQueries(['xmtp client', client?.address]);
      },
      onError: (error) => {
        onError && onError(error);
      },
    }
  );
};
