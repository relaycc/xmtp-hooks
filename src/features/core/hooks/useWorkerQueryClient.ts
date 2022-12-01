import { QueryContext } from '../context';
import { useQueryClient } from '@tanstack/react-query';

export const useWorkerQueryClient = () => {
  return useQueryClient({ context: QueryContext });
};
