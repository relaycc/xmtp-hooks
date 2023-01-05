import { Conversation as XmtpConversation } from '@relaycc/xmtp-js';
import { EthAddress, isEthAddress } from './eth';

export interface Conversation {
  peerAddress: EthAddress;
  context?: {
    conversationId: string;
    metadata: { [key: string]: string };
  };
}

export const isConversation = (value: unknown): value is Conversation => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const conversation = value as Conversation;
  if (!isEthAddress(conversation.peerAddress)) {
    return false;
  }
  if (conversation.context !== undefined) {
    if (
      typeof conversation.context !== 'object' ||
      conversation.context === null
    ) {
      return false;
    }
    const context = conversation.context;
    if (typeof context.conversationId !== 'string') {
      return false;
    }
    if (typeof context.metadata !== 'object' || context.metadata === null) {
      return false;
    }
    if (
      !Object.keys(context.metadata).every((key) => {
        const value = context.metadata[key];
        return typeof value === 'string';
      })
    ) {
      return false;
    }
  }
  return true;
};

export const fromXmtpConversation = (
  conversation: XmtpConversation
): Conversation => {
  if (!isEthAddress(conversation.peerAddress)) {
    throw new Error('Invalid peer address');
  } else {
    return {
      peerAddress: conversation.peerAddress,
      context: conversation.context || undefined,
    };
  }
};

export const addConversation = (
  conversations: Conversation[],
  conversation: Conversation
): Conversation[] | null => {
  if (
    conversations.some(
      (c) =>
        c.peerAddress === conversation.peerAddress &&
        c.context?.conversationId === conversation.context?.conversationId
    )
  ) {
    return null;
  } else {
    return [conversation, ...conversations];
  }
};

export const isSameConversation = (
  a: Conversation,
  b: Conversation
): boolean => {
  return (
    a.peerAddress === b.peerAddress &&
    a.context?.conversationId === b.context?.conversationId
  );
};
