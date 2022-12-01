import { messageApi } from '@xmtp/proto';
import { ListMessagesOptions as XmtpListMessagesOptions } from '@xmtp/xmtp-js';

export interface ListMessagesOptions {
  limit?: number;
  direction?: 'ascending' | 'descending';
}

export const toXmtpListMessagesOptions = (
  listMessagesOptions: ListMessagesOptions
): XmtpListMessagesOptions => {
  return {
    ...listMessagesOptions,
    direction: (() => {
      if (listMessagesOptions.direction === 'ascending') {
        return messageApi.SortDirection.SORT_DIRECTION_ASCENDING;
      } else {
        return messageApi.SortDirection.SORT_DIRECTION_DESCENDING;
      }
    })(),
  };
};
