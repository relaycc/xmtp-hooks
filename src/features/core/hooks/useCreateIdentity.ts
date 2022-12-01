import { useMutation } from '@tanstack/react-query';
import { useWorkerClient } from './useWorkerClient';
import { QueryContext } from '../context';

export const useCreateIdentity = () => {
  const worker = useWorkerClient();

  return useMutation(
    async () => {
      if (worker === null) {
        throw new Error('useCreateIdentity :: workerClient is null');
      } else {
        return await worker.createIdentity();
      }
    },
    {
      context: QueryContext,
    }
  );
};
