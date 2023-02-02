import { ContentTypeId, DecodedMessage } from '@relaycc/xmtp-js';
import { EthAddress, isEthAddress } from './eth';
import {
  Conversation,
  fromXmtpConversation,
  isConversation,
} from './conversation';

export interface Message {
  id: string;
  conversation: Conversation;
  senderAddress: EthAddress;
  sent: Date;
  content: unknown;
  contentType: ContentTypeId;
}

export const isMessage = (value: unknown): value is Message => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const message = value as Message;
  if (typeof message.id !== 'string') {
    return false;
  }
  if (!isConversation(message.conversation)) {
    return false;
  }
  if (!isEthAddress(message.senderAddress)) {
    return false;
  }
  if (!(message.sent instanceof Date)) {
    return false;
  }
  return true;
};

export const fromXmtpMessage = (message: DecodedMessage): Message => {
  return {
    id: message.id,
    conversation: fromXmtpConversation(message.conversation),
    senderAddress: (() => {
      if (!isEthAddress(message.senderAddress)) {
        throw new Error(`Invalid sender address: ${message.senderAddress}`);
      } else {
        return message.senderAddress;
      }
    })(),
    sent: message.sent,
    content: message.content,
    contentType: message.contentType,
  };
};

export const addMessage = (
  messages: Message[],
  message: Message
): Message[] | null => {
  if (messages.some((m) => m.id === message.id)) {
    return null;
  } else {
    return [message, ...messages];
  }
};
