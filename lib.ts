import { Signer } from "@ethersproject/abstract-signer";
import {
  Client as XmtpClient,
  ClientOptions as XmtpClientOptions,
  DecodedMessage,
  ListMessagesOptions,
  ConversationV1,
  ConversationV2,
  SortDirection,
} from "@relaycc/xmtp-js";
import { SendOptions } from "@xmtp/xmtp-js";

/* **************************************************************************
 *
 *
 *
 *
 *
 *
 * XMTP
 *
 *
 *
 *
 *
 * *************************************************************************/

export type Xmtp = {
  startClient: (
    wallet: Signer | null,
    opts?: Partial<ClientOptions>
  ) => Promise<Client>;
  stopClient: () => Promise<boolean>;
  fetchClient: ({ opts }: { opts?: FetchClientOpts }) => Promise<Client>;
  fetchMessages: ({
    conversation,
    opts,
  }: {
    conversation: Conversation;
    opts?: ListMessagesOptions;
  }) => Promise<Message[]>;
  fetchConversations: () => Promise<Conversation[]>;
  fetchPeerOnNetwork: ({
    peerAddress,
  }: {
    peerAddress: string;
  }) => Promise<boolean>;
  sendMessage: ({
    conversation,
    content,
    opts,
  }: {
    conversation: Conversation;
    content: unknown;
    opts?: SendOptions;
  }) => Promise<Message>;
  startStreamingMessages: ({
    conversation,
  }: {
    conversation: Conversation;
  }) => Promise<boolean>;
  stopStreamingMessages: ({
    conversation,
  }: {
    conversation: Conversation;
  }) => Promise<void>;
  listenToStreamingMessages: (
    conversation: Conversation,
    handler: (m: Message) => unknown
  ) => Promise<string>;
  startStreamingConversations: () => Promise<boolean>;
  stopStreamingConversations: () => Promise<void>;
  listenToStreamingConversations: (
    handler: (c: Conversation) => unknown
  ) => Promise<string>;
  startStreamingAllMessages: () => Promise<boolean>;
  stopStreamingAllMessages: () => Promise<void>;
  listenToStreamingAllMessages: (
    handler: (m: Message) => unknown
  ) => Promise<string>;
  test: (fn: () => null) => Promise<null>;
};

/* **************************************************************************
 *
 *
 *
 *
 *
 *
 * Client
 *
 *
 *
 *
 *
 * *************************************************************************/

export type ClientExport = Uint8Array;

export type Client = {
  address: string;
  env: ClientOptions["env"];
  export?: string;
};

export type ClientOptions = {
  env?: XmtpClientOptions["env"];
  privateKeyOverride?: string;
};

export const toXmtpClientOpts = ({
  opts,
}: {
  opts?: Partial<ClientOptions>;
}): Partial<XmtpClientOptions> & {
  env: XmtpClientOptions["env"];
} => {
  return {
    ...opts,
    env: opts?.env || "production",
    privateKeyOverride: (() => {
      if (opts?.privateKeyOverride === undefined) {
        return undefined;
      } else {
        return Buffer.from(opts.privateKeyOverride, "base64");
      }
    })(),
  };
};

export type FetchClientOpts = {
  includeExport?: boolean;
};

/* **************************************************************************
 *
 *
 *
 *
 *
 *
 * Conversations
 *
 *
 *
 *
 *
 * *************************************************************************/

type ConversationV0Export = {
  version?: "v0";
  peerAddress: string;
  context?: {
    conversationId: string;
    metadata: { [key: string]: string };
  };
};

type ConversationV1Export = {
  version: "v1";
  peerAddress: string;
  createdAt: Date;
};

type ConversationV2Export = {
  version: "v2";
  topic: string;
  keyMaterial: string;
  createdAt: Date;
  peerAddress: string;
  context:
    | {
        conversationId: string;
        metadata: { [key: string]: string };
      }
    | undefined;
};

export type Conversation =
  | ConversationV0Export
  | ConversationV1Export
  | ConversationV2Export;

export const uniqueConversationKey = (conversation: Conversation) => {
  if (conversation.version === "v1") {
    return conversation.peerAddress;
  } else {
    return `${conversation.peerAddress}-${conversation.context?.conversationId}`;
  }
};

export const toXmtpConversation = async ({
  client,
  conversation,
}: {
  client: XmtpClient;
  conversation: Conversation;
}) => {
  if (conversation.version === "v1") {
    return ConversationV1.fromExport(client, conversation);
  } else if (conversation.version === "v2") {
    return ConversationV2.fromExport(client, conversation);
  } else {
    return client.conversations.newConversation(
      conversation.peerAddress,
      conversation.context
    );
  }
};

/* **************************************************************************
 *
 *
 *
 *
 *
 *
 * Messages
 *
 *
 *
 *
 *
 * *************************************************************************/

export interface Message {
  id: string;
  conversation: Conversation;
  senderAddress: string;
  sent: Date;
  content: unknown;
}

export const getNextPageOptions = ({ messages }: { messages?: Message[] }) => {
  if (messages === undefined) {
    return { limit: 25, direction: SortDirection.SORT_DIRECTION_DESCENDING };
  } else if (messages.length === 0) {
    return { limit: 25, direction: SortDirection.SORT_DIRECTION_DESCENDING };
  } else {
    return {
      limit: 25,
      direction: SortDirection.SORT_DIRECTION_DESCENDING,
      endTime: messages[messages.length - 1].sent,
    };
  }
};

export const fromXmtpMessage = ({
  message,
}: {
  message: DecodedMessage;
}): Message => {
  return {
    id: message.id,
    conversation: message.conversation.export(),
    senderAddress: message.senderAddress,
    sent: message.sent,
    content: message.content,
  };
};

export const insertMessagesIfNew = ({
  messages,
  newMessages,
}: {
  messages: Message[];
  newMessages: Message | Message[];
}) => {
  return ((messages: Message[], newMessages: Message[]) => {
    if (messages.length === 0 || newMessages.length === 0) {
      return [...messages, ...newMessages];
    } else {
      for (let i = 0; i < newMessages.length; i++) {
        for (let j = 0; j < messages.length; j++) {
          if (messages[j].id === newMessages[i].id) {
            break;
          }
          if (messages[j].sent < newMessages[i].sent) {
            messages.splice(j, 0, newMessages[i]);
            break;
          }
          if (j === messages.length - 1) {
            messages.push(newMessages[i]);
            break;
          }
        }
      }
    }
    return messages;
  })(
    [...(messages || [])],
    Array.isArray(newMessages) ? [...newMessages] : [newMessages]
  );
};

/* **************************************************************************
 *
 *
 *
 *
 *
 *
 * Preview
 *
 *
 *
 *
 *
 * *************************************************************************/

export type Preview = Conversation & {
  preview: Message;
};

export const uniquePreviewKey = (preview: Preview) => {
  if (preview.version === "v1") {
    return preview.peerAddress;
  } else {
    return `${preview.peerAddress}-${preview.context?.conversationId}`;
  }
};

export const insertOrUpdatePreviews = (
  previews: Preview[],
  newPreviews: Preview | Preview[]
) => {
  return ((previews: Preview[], newPreviews: Preview[]) => {
    if (previews.length === 0) {
      return newPreviews;
    } else {
      for (let i = 0; i < newPreviews.length; i++) {
        for (let j = 0; j < previews.length; j++) {
          if (
            uniquePreviewKey(previews[j]) === uniquePreviewKey(newPreviews[i])
          ) {
            if (
              previews[j].preview.sent.getTime() <
              newPreviews[i].preview.sent.getTime()
            ) {
              previews[j] = newPreviews[i];
            }
            break;
          }
          if (j === previews.length - 1) {
            previews.push(newPreviews[i]);
            break;
          }
        }
      }
      return previews;
    }
  })(
    [...previews],
    Array.isArray(newPreviews) ? [...newPreviews] : [newPreviews]
  );
};

export const sortByMostRecentPreview = (previews: Preview[]) => {
  return [...previews].sort((a, b) => {
    return b.preview.sent.getTime() - a.preview.sent.getTime();
  });
};

/* **************************************************************************
 *
 *
 *
 *
 *
 *
 * Errors
 *
 *
 *
 *
 *
 * *************************************************************************/

export const ErrorCodes = {
  STREAM_ALREADY_EXISTS: "STREAM_EXISTS",
  STREAM_NOT_FOUND: "STREAM_NOT_FOUND",
  CLIENT_ALREADY_EXISTS: "CLIENT_EXISTS",
  CLIENT_NOT_FOUND: "CLIENT_NOT_FOUND",
  SIGNING_FAILED: "SIGNING_FAILED",
  BAD_ARGUMENTS: "BAD_ARGUMENTS",
} as const;
