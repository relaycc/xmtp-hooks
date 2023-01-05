import { UseQueryResult } from '@tanstack/react-query';

export type XmtpWorkerQueryResult<T> = UseQueryResult<T, unknown> & {
  isWaiting: boolean;
};
