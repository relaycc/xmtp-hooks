import { ContentTypeText } from '@xmtp/xmtp-js';
import {
  JSON_ID as XMTP_JSON_ID,
  ContentTypeId as XmtpContentTypeId,
} from '../codecs';

export const JSON_ID = 'relay.cc/Json:0.1';
export type JsonId = typeof JSON_ID;
export type ContentTypeId = JsonId | 'xmtp.org/text:0.1';

export const fromXmtpContentTypeId = (id: XmtpContentTypeId): ContentTypeId => {
  switch (id) {
    case XMTP_JSON_ID:
      return JSON_ID;
    default:
      return 'xmtp.org/text:0.1';
  }
};

export const toXmtpContentTypeId = (id: ContentTypeId): XmtpContentTypeId => {
  switch (id) {
    case JSON_ID:
      return XMTP_JSON_ID;
    default:
      return ContentTypeText;
  }
};
