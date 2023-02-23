import { Buffer } from "buffer";
(globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
import * as Comlink from "comlink";
import {
  Xmtp,
  uniqueConversationKey,
  Conversation,
  Message,
  fromXmtpMessage,
  ErrorCodes,
  toXmtpConversation,
  toXmtpClientOpts,
  FetchClientOpts,
} from "./lib";
import {
  Client as XmtpClient,
  DecodedMessage as XmtpDecodedMessage,
  ClientOptions as XmtpClientOptions,
  Stream as XmtpStream,
  Conversation as XmtpConversation,
} from "@relaycc/xmtp-js";

/* **************************************************************************
 *
 *
 *
 *
 *
 *
 * Worker State
 *
 *
 *
 *
 *
 * *************************************************************************/

const WORKER_STATE: {
  client: {
    client: XmtpClient;
    env: XmtpClientOptions["env"];
    export: string;
  } | null;
  messagesStream: MessageStream | null;
  conversationsStream: ConversationStream | null;
  messageStreams: Record<string, MessageStream>;
} = {
  client: null,
  messagesStream: null,
  conversationsStream: null,
  messageStreams: {},
};

/* **************************************************************************
 *
 *
 *
 *
 *
 *
 * Exposed Actions
 *
 *
 *
 *
 *
 * *************************************************************************/

const test = async (fn: () => null) => {
  return fn();
};

const startClient: Xmtp["startClient"] = async (wallet, opts) => {
  if (WORKER_STATE.client !== null) {
    throw new Error(ErrorCodes.CLIENT_ALREADY_EXISTS);
  } else {
    const finalOpts = toXmtpClientOpts({ opts });
    const keys = await (async () => {
      if (wallet === null) {
        if (!(finalOpts.privateKeyOverride instanceof Uint8Array)) {
          throw new Error(ErrorCodes.BAD_ARGUMENTS);
        } else {
          return finalOpts.privateKeyOverride;
        }
      } else {
        return await XmtpClient.getKeys(wallet, finalOpts);
      }
    })();
    const xmtpClient = await XmtpClient.create(null, {
      ...finalOpts,
      privateKeyOverride: keys,
    });
    WORKER_STATE.client = {
      client: xmtpClient,
      env: finalOpts.env,
      export: Buffer.from(keys).toString("base64"),
    };
    return {
      address: xmtpClient.address,
      env: finalOpts.env,
      export: Buffer.from(keys).toString("base64"),
    };
  }
};

const stopClient: Xmtp["stopClient"] = async () => {
  getClientOrThrow();
  WORKER_STATE.client = null;
  return true;
};

const fetchClient: Xmtp["fetchClient"] = async ({
  opts,
}: {
  opts?: Partial<FetchClientOpts>;
}) => {
  return {
    address: getClientOrThrow().address,
    env: getEnvOrThrow(),
    export: (() => {
      if (!opts?.includeExport) {
        return undefined;
      } else {
        return getExportOrThrow();
      }
    })(),
  };
};

const fetchMessages: Xmtp["fetchMessages"] = async ({ conversation, opts }) => {
  const client = getClientOrThrow();
  const convo = await toXmtpConversation({ client, conversation });
  const messages: XmtpDecodedMessage[] = await convo.messages(opts);
  return messages.map((message) => fromXmtpMessage({ message }));
};

const fetchConversations: Xmtp["fetchConversations"] = async () => {
  const client = getClientOrThrow();
  const conversations = await client.conversations.list();
  return conversations.map((c) => c.export());
};

const fetchPeerOnNetwork: Xmtp["fetchPeerOnNetwork"] = async ({
  peerAddress,
}) => {
  const client = getClientOrThrow();
  return client.canMessage(peerAddress);
};

const sendMessage: Xmtp["sendMessage"] = async ({
  conversation,
  content,
  opts,
}) => {
  const client = getClientOrThrow();
  const convo = await toXmtpConversation({ client, conversation });
  const sent = await convo.send(content, opts);
  return fromXmtpMessage({ message: sent });
};

const startStreamingMessages: Xmtp["startStreamingMessages"] = async ({
  conversation,
}) => {
  const client = getClientOrThrow();
  const key = uniqueConversationKey(conversation);
  const preexisting = WORKER_STATE.messageStreams[key];
  if (preexisting !== undefined) {
    throw new Error(ErrorCodes.STREAM_ALREADY_EXISTS);
  } else {
    const convo = await toXmtpConversation({ client, conversation });
    const stream = await convo.streamMessages();
    WORKER_STATE.messageStreams[key] = new MessageStream(stream);
    return true;
  }
};

const stopStreamingMessages: Xmtp["stopStreamingMessages"] = async ({
  conversation,
}) => {
  getClientOrThrow();
  const key = uniqueConversationKey(conversation);
  const preexisting = WORKER_STATE.messageStreams[key];
  if (preexisting === undefined) {
    throw new Error(ErrorCodes.STREAM_NOT_FOUND);
  } else {
    preexisting.stop();
  }
};

const listenToStreamingMessages: Xmtp["listenToStreamingMessages"] = async (
  conversation,
  handler
) => {
  getClientOrThrow();
  const key = uniqueConversationKey(conversation);
  const preexisting = WORKER_STATE.messageStreams[key];
  if (preexisting === undefined) {
    throw new Error(ErrorCodes.STREAM_NOT_FOUND);
  } else {
    return preexisting.addHandler(handler);
  }
};

const startStreamingConversations: Xmtp["startStreamingConversations"] =
  async () => {
    const client = getClientOrThrow();
    const preexisting = WORKER_STATE.conversationsStream;
    if (preexisting !== null) {
      throw new Error(ErrorCodes.STREAM_ALREADY_EXISTS);
    } else {
      const stream = await client.conversations.stream();
      WORKER_STATE.conversationsStream = new ConversationStream(stream);
      return true;
    }
  };

const stopStreamingConversations: Xmtp["stopStreamingConversations"] =
  async () => {
    getClientOrThrow();
    const preexisting = WORKER_STATE.conversationsStream;
    if (preexisting === null) {
      throw new Error(ErrorCodes.STREAM_NOT_FOUND);
    } else {
      preexisting.stop();
    }
  };

const listenToStreamingConversations: Xmtp["listenToStreamingConversations"] =
  async (handler) => {
    getClientOrThrow();
    const preexisting = WORKER_STATE.conversationsStream;
    if (preexisting === null) {
      throw new Error(ErrorCodes.STREAM_NOT_FOUND);
    } else {
      return preexisting.addHandler(handler);
    }
  };

const startStreamingAllMessages: Xmtp["startStreamingAllMessages"] =
  async () => {
    const client = getClientOrThrow();
    if (WORKER_STATE.messagesStream !== null) {
      throw new Error(ErrorCodes.STREAM_ALREADY_EXISTS);
    } else {
      const stream = await client.conversations.streamAllMessages();
      WORKER_STATE.messagesStream = new MessageStream(stream);
      return true;
    }
  };

const stopStreamingAllMessages: Xmtp["stopStreamingAllMessages"] = async () => {
  const preexisting = WORKER_STATE.messagesStream;
  if (preexisting === null) {
    throw new Error(ErrorCodes.STREAM_NOT_FOUND);
  } else {
    preexisting.stop();
  }
};

const listenToStreamingAllMessages: Xmtp["listenToStreamingAllMessages"] =
  async (handler) => {
    const preexisting = WORKER_STATE.messagesStream;
    if (preexisting === null) {
      throw new Error(ErrorCodes.STREAM_NOT_FOUND);
    } else {
      return preexisting.addHandler(handler);
    }
  };

const getClientOrThrow = (): XmtpClient => {
  if (WORKER_STATE.client === null) {
    throw new Error(ErrorCodes.CLIENT_NOT_FOUND);
  } else {
    return WORKER_STATE.client.client;
  }
};

const getEnvOrThrow = (): XmtpClientOptions["env"] => {
  if (WORKER_STATE.client === null) {
    throw new Error(ErrorCodes.CLIENT_NOT_FOUND);
  } else {
    return WORKER_STATE.client.env;
  }
};

const getExportOrThrow = (): string => {
  if (WORKER_STATE.client === null) {
    throw new Error(ErrorCodes.CLIENT_NOT_FOUND);
  } else {
    return WORKER_STATE.client.export;
  }
};

Comlink.expose({
  startClient,
  stopClient,
  fetchClient,
  fetchMessages,
  fetchConversations,
  fetchPeerOnNetwork,
  sendMessage,
  startStreamingMessages,
  stopStreamingMessages,
  listenToStreamingMessages,
  startStreamingConversations,
  stopStreamingConversations,
  listenToStreamingConversations,
  startStreamingAllMessages,
  stopStreamingAllMessages,
  listenToStreamingAllMessages,
  test,
});

/* **************************************************************************
 *
 *
 *
 *
 *
 *
 * Helpers
 *
 *
 *
 *
 *
 * *************************************************************************/

class SerializedStream<P, S> {
  private handlers: Record<string, (s: S) => unknown> = {};

  public constructor(
    private stream: XmtpStream<P> | AsyncGenerator<P, unknown, unknown>,
    private serializer: (p: P) => S
  ) {
    this.start();
  }

  private async start() {
    for await (const p of this.stream) {
      for (const handler of Object.values(this.handlers)) {
        handler(this.serializer(p));
      }
    }
  }

  public async stop() {
    return this.stream.return(true);
  }

  public addHandler(handler: (s: S) => unknown) {
    const key = this.buildKey();
    this.handlers[key] = handler;
    return key;
  }

  public removeHandler(key: string) {
    if (this.handlers[key] === undefined) {
      return null;
    } else {
      delete this.handlers[key];
      return key;
    }
  }

  public buildKey() {
    return `${Math.random()}${Math.random()}${Math.random()}${Math.random()}`;
  }
}

class MessageStream extends SerializedStream<XmtpDecodedMessage, Message> {
  public constructor(
    stream:
      | XmtpStream<XmtpDecodedMessage>
      | AsyncGenerator<XmtpDecodedMessage, unknown, unknown>
  ) {
    super(stream, (message: XmtpDecodedMessage) =>
      fromXmtpMessage({ message })
    );
  }
}

class ConversationStream extends SerializedStream<
  XmtpConversation,
  Conversation
> {
  public constructor(
    stream:
      | XmtpStream<XmtpConversation>
      | AsyncGenerator<XmtpConversation, unknown, unknown>
  ) {
    super(stream, (c) => c.export());
  }
}
