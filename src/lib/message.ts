import { DecodedMessage } from '@xmtp/xmtp-js';
import { EthAddress, isEthAddress } from './eth';
import { Conversation, fromXmtpConversation } from './conversation';

export interface Message {
  id: string;
  conversation: Conversation;
  senderAddress: EthAddress;
  sent: Date;
  content: unknown;
}

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
