import { SendOptions as XmtpSendOptions } from '@xmtp/xmtp-js';
import { toXmtpContentTypeId, ContentTypeId } from './content-type-id';

export interface SendOptions {
  contentType?: ContentTypeId;
}

export const toXmtpSendOptions = (
  opts?: SendOptions
): XmtpSendOptions | undefined => {
  if (opts === undefined) {
    return undefined;
  } else {
    return {
      ...opts,
      contentType: (() => {
        if (opts.contentType === undefined) {
          return undefined;
        } else {
          return toXmtpContentTypeId(opts.contentType);
        }
      })(),
    };
  }
};
