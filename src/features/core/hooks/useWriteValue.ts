import { EthAddress, isEthAddress } from '../../../lib';
import { useXmtpClient } from './useXmtpClient';
import { useWorkerQueryClient } from './useWorkerQueryClient';
import { QueryContext } from '../context';
import { useMutation } from '@tanstack/react-query';

export type UseWriteValueProps = {
  clientAddress: EthAddress;
  key: string;
  opts?: {
    onSuccess?: () => unknown;
    onError?: (error: unknown) => unknown;
  };
};

export const useWriteValue = ({
  clientAddress,
  key,
  opts,
}: UseWriteValueProps) => {
  const queryClient = useWorkerQueryClient();
  const client = useXmtpClient({ clientAddress });

  return useMutation(
    async ({ content }: { content: unknown }) => {
      if (
        client.data === null ||
        client.data === undefined ||
        !isEthAddress(clientAddress)
      ) {
        throw new Error(
          'useWriteValue mutationFn, client isReady = false or clientAddress is not an EthAddress'
        );
      } else {
        return await client.data.writeValue(key, content);
      }
    },
    {
      context: QueryContext,
      onSuccess: () => {
        opts?.onSuccess && opts.onSuccess();
        queryClient.invalidateQueries(['key value', clientAddress, key]);
      },
      onError: (error) => {
        opts?.onError && opts.onError(error);
      },
    }
  );
};
