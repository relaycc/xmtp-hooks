import { useContext } from 'react';
import { XmtpWorkerClient } from '../lib';
import { XmtpContext } from '../context';

export const useWorkerClient = (): XmtpWorkerClient | null => {
  const context = useContext(XmtpContext);
  if (context === undefined) {
    throw new Error('useWorkerClient must be used within a ConfigProvider');
  } else {
    return context?.workerClient || null;
  }
};
