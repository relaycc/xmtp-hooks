import React, { ReactNode, createContext } from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { XmtpWorkerClient } from './lib';

const queryClient = new QueryClient();
export const QueryContext = createContext<QueryClient | undefined>(queryClient);

export interface Config {
  workerClient: XmtpWorkerClient;
}

export const XmtpContext = createContext<Config | null>(null);

export const XmtpProvider = ({
  children,
  config,
}: {
  children: ReactNode;
  config: { worker: Worker };
}) => {
  return (
    <XmtpContext.Provider
      value={{ workerClient: new XmtpWorkerClient(config.worker) }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </XmtpContext.Provider>
  );
};
