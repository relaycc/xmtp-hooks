import { ContentTypeText } from '@relaycc/xmtp-js';
import { JSON_ID } from '.';

export type ContentTypeId = typeof JSON_ID | typeof ContentTypeText;
