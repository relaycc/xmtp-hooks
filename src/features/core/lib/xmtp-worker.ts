import {
  Client,
  Client as Xmtp,
  DecodedMessage,
  Conversation as XmtpConversation,
  Stream,
} from '@relaycc/xmtp-js';
import { Wallet as EthersWallet } from '@ethersproject/wallet';
import { Signer } from '@ethersproject/abstract-signer';
import * as Comlink from 'comlink';
import { JSONCodec } from '../../../codecs';
import {
  IdentityWallet,
  Wallet,
  Message,
  ClientOptions,
  SendOptions,
  fromXmtpMessage,
  fromXmtpClient,
  fromXmtpConversation,
  toXmtpSendOptions,
  Conversation,
  isEthAddress,
  EthAddress,
  JSON_ID,
  isIdentityWallet,
} from '../../../lib';
import { IXmtpWorker, TargetOpts } from './xmtp-worker-interface';
import { messageApi } from '@xmtp/proto';

const CODECS = [new JSONCodec()];

class XmtpWorker implements IXmtpWorker {
  public clients: Record<
    string,
    { client: Xmtp; env: 'dev' | 'production' } | undefined
  > = {};

  private allMessagesStreamStore: AllMessageStreamStore =
    new AllMessageStreamStore();
  private messageStreamStore: MessageStreamStore = new MessageStreamStore();
  private conversationStreamStore: ConversationStreamStore =
    new ConversationStreamStore();

  public async createIdentity(): Promise<IdentityWallet | null> {
    log('createIdentity');
    const wallet = EthersWallet.createRandom();
    await Xmtp.create(wallet, {
      env: 'dev',
      codecs: CODECS,
    });
    await Xmtp.create(wallet, {
      env: 'production',
      codecs: CODECS,
    });
    const keys = await Client.getKeys(wallet);
    log(
      `createIdentity :: returning prod and dev created for address ${wallet.address}`
    );

    if (!isEthAddress(wallet.address)) {
      err(
        `createIdentity :: wallet.address is not an EthAddress: ${wallet.address}`
      );
      return null;
    } else {
      return {
        address: wallet.address,
        uuid: keys,
      };
    }
  }

  public async startClient(wallet: Wallet, opts?: Partial<ClientOptions>) {
    log(`startClient opts ${JSON.stringify(opts)}`);
    const address = await (async () => {
      if (isIdentityWallet(wallet)) {
        log(`startClient :: wallet is an identity wallet`);
        console.log('wallet uuid');
        console.log(wallet.uuid);
        return wallet.address;
      } else {
        log(`startClient :: wallet is a signer`);
        log(`startClient :: wallet type: ${typeof wallet}`);
        return wallet.getAddress();
      }
    })();
    log(`startClient address: ${address}`);

    try {
      const preexistingClient = this.clients[address];
      if (preexistingClient !== undefined) {
        warn(
          `startClient :: preexistingClient address ${preexistingClient.client.address}`
        );
        return null;
      } else {
        log(`startClient :: starting client for address ${address}`);
        const client = await (async () => {
          if (isIdentityWallet(wallet)) {
            log(`startClient :: wallet uuid`);
            console.log(wallet.uuid);
            log(`startClient :: creating from stored identity`);
            return Xmtp.create(null, {
              env: 'production',
              privateKeyOverride: new Uint8Array(wallet.uuid),
            });
          } else {
            log(`startClient :: creating from signer`);
            return Xmtp.create(wallet as unknown as Signer, {
              ...opts,
              codecs: CODECS,
            });
          }
        })();

        log(`startClient :: SUCCESS, saving client to state for ${address}`);
        this.clients[address] = { client, env: opts?.env ?? 'dev' };

        return fromXmtpClient(client, opts);
      }
    } catch (error) {
      err(
        `startClient :: error starting client for address ${address}: ${error}`
      );
      return null;
    }
  }

  public async stopClient(opts: TargetOpts) {
    try {
      log(`stopClient opts ${JSON.stringify(opts)}`);
      const clientToStop = this.getTargetClient(opts);
      if (clientToStop === null) {
        warn(`stopClient :: no client found for opts ${JSON.stringify(opts)}`);
        return null;
      } else {
        delete this.clients[clientToStop.address];
        log(`stopClient :: stopped client for ${clientToStop.address}`);
        return fromXmtpClient(clientToStop);
      }
    } catch (error) {
      err(
        `stopClient :: error stopping client for opts ${JSON.stringify(
          opts
        )}: error: ${error}`
      );
      return null;
    }
  }

  public fetchClient = async (opts: TargetOpts) => {
    log(`fetchClient opts ${JSON.stringify(opts)}`);
    const client = this.getTargetClient(opts);
    if (client === null) {
      warn(`fetchClient :: no client for ${JSON.stringify(opts)}`);
      return null;
    } else {
      log(`fetchClient :: get client address ${client.address}`);
      return fromXmtpClient(client);
    }
  };

  public async fetchMessages(conversation: Conversation, opts: TargetOpts) {
    log(
      `fetchMessages for conversation ${conversation.peerAddress} ${
        conversation.context?.conversationId
      } opts ${JSON.stringify(opts)}`
    );
    const client = this.getTargetClient(opts);
    if (client === null) {
      warn(`fetchMessages :: no client for ${JSON.stringify(opts)}`);
      return null;
    } else {
      try {
        log('fetchMessages :: got client, creating conversation');
        const convo = await client.conversations.newConversation(
          conversation.peerAddress,
          conversation.context
        );
        const messages: Message[] = [];
        for await (const page of convo.messagesPaginated({
          pageSize: 25,
        })) {
          for (const msg of page) {
            messages.push(fromXmtpMessage(msg));
          }
          break;
        }
        log(`fetchMessages :: returning ${messages.length} messages`);
        return messages;
      } catch (error) {
        err(
          `fetchMessages :: error fetching messages for conversation ${JSON.stringify(
            conversation
          )} opts ${JSON.stringify(opts)}: ${error}`
        );
        return null;
      }
    }
  }

  public async readValue(key: string, opts: TargetOpts) {
    log(`readValue key ${key} opts ${JSON.stringify(opts)}`);
    const client = this.getTargetClient(opts);
    if (client === null) {
      warn(`readValue :: no client for ${JSON.stringify(opts)}`);
      return null;
    } else {
      const convo = await client.conversations.newConversation(client.address, {
        conversationId: key,
        metadata: {},
      });
      for await (const page of convo.messagesPaginated({
        pageSize: 1,
        direction: messageApi.SortDirection.SORT_DIRECTION_DESCENDING,
      })) {
        log(
          `readValue :: got a message to use for value: content: ${page[0].content}`
        );
        return fromXmtpMessage(page[0]).content;
      }
    }
  }

  public async writeValue(key: string, value: unknown, opts: TargetOpts) {
    log(`writeValue key ${key} opts ${JSON.stringify(opts)}`);
    const client = this.getTargetClient(opts);
    if (client === null) {
      warn(`writeValue :: no client for ${JSON.stringify(opts)}`);
      return null;
    } else {
      if (!isEthAddress(client.address)) {
        throw new Error(
          'writeValue :: getTargetClient returned a client with a non-EthAddress address'
        );
      }
      // TODO - You could potentially send a message to the wrong address if the
      // default client changes between the time you fetch the conversation and
      // the time you send the message.
      try {
        log(`writeValue :: got client, writing value ${JSON.stringify(value)}`);
        return await this.sendMessage(
          {
            peerAddress: client.address,
            context: {
              conversationId: key,
              metadata: {},
            },
          },
          value,
          { ...opts, contentType: JSON_ID }
        );
      } catch (error) {
        err(
          `writeValue :: error writing value: error: ${error}: value: ${value}`
        );
        return null;
      }
    }
  }

  public async fetchConversations(opts: TargetOpts) {
    log(`fetchConversations opts ${JSON.stringify(opts)}`);
    const client = this.getTargetClient(opts);
    if (client === null) {
      warn(`fetchConversations :: no client for ${JSON.stringify(opts)}`);
      return null;
    } else {
      const conversations = await client.conversations.list();
      log(`fetchConversations :: got ${conversations.length} conversations`);
      return conversations.map(fromXmtpConversation);
    }
  }

  public async fetchPeerOnNetwork(peerAddress: string, opts: TargetOpts) {
    log(`fetchPeerOnNetwork peerAddress ${peerAddress} opts ${opts}`);
    const client = this.getTargetClient(opts);
    if (client === null) {
      warn(`fetchPeerOnNetwork :: no client for ${JSON.stringify(opts)}`);
      throw new Error('fetchPeerOnNetwork without a client!');
    } else {
      return client.canMessage(peerAddress);
    }
  }

  public async sendMessage(
    conversation: Conversation,
    message: unknown,
    opts: Partial<SendOptions> & TargetOpts
  ) {
    log(
      `sendMessage conversation ${JSON.stringify(
        conversation
      )} opts ${JSON.stringify(opts)}`
    );
    const client = this.getTargetClient(opts);
    if (client === null) {
      warn(`sendMessage :: no client for ${JSON.stringify(opts)}`);
      return null;
    } else {
      const convo = await client.conversations.newConversation(
        conversation.peerAddress,
        conversation.context
      );
      try {
        log(`sendMessage :: created conversation, sending message`);
        const sent = await convo.send(message, toXmtpSendOptions(opts));
        log(
          `sendMessage :: sent message, ${JSON.stringify({
            conversation: fromXmtpConversation(sent.conversation),
            recipientAddress: sent.recipientAddress || 'no recipient',
            senderaddress: sent.senderAddress || 'no sender',
            id: sent.id,
            content: sent.content,
          })}`
        );
        return fromXmtpMessage(sent);
      } catch (error) {
        err(
          `sendMessage :: error sending message: ${error} opts: ${JSON.stringify(
            opts
          )}`
        );
        return null;
      }
    }
  }

  public async startMessageStream(
    conversation: Conversation,
    opts: TargetOpts
  ) {
    log(`startMessageStream conversation ${JSON.stringify(conversation)}`);
    const client = this.getTargetClient(opts);
    if (client === null) {
      warn(`startMessageStream :: no client for ${JSON.stringify(opts)}`);
      return null;
    } else {
      const key = this.messageStreamStore.buildKey(client, conversation);
      const preexisting = this.messageStreamStore.read(key);

      if (preexisting !== null) {
        warn(`startMessageStream :: stream already exists for ${key}`);
        return true;
      } else {
        try {
          log(`startMessageStream :: creating stream for ${key}`);
          const messageStream = await MessageStream.create(
            client,
            conversation
          );
          this.messageStreamStore.write(key, messageStream);
          return true;
        } catch (error) {
          err(
            `startMessageStream :: error starting stream for key ${key}: error: ${error}`
          );
          return false;
        }
      }
    }
  }

  public async addListenerToMessageStream(
    conversation: Conversation,
    handler: (message: Message) => unknown,
    opts: TargetOpts
  ) {
    log(
      `addListenerToMessageStream conversation ${JSON.stringify(conversation)}`
    );
    const client = this.getTargetClient(opts);
    if (client === null) {
      warn(
        `addListenerToMessageStream :: no client for ${JSON.stringify(opts)}`
      );
      return null;
    } else {
      const key = this.messageStreamStore.buildKey(client, conversation);
      const preexisting = this.messageStreamStore.read(key);
      if (preexisting === null) {
        warn(`addListenerToMessageStream :: no stream for ${key}`);
        return null;
      } else {
        log(`addListenerToMessageStream :: adding listener to ${key}`);
        return preexisting.addHandler(handler);
      }
    }
  }

  public async startAllMessagesStream(opts: TargetOpts) {
    log(`startAllMessagesStream opts ${JSON.stringify(opts)}`);
    const client = this.getTargetClient(opts);
    if (client === null) {
      warn(`startAllMessagesStream :: no client for ${JSON.stringify(opts)}`);
      return null;
    } else {
      const key = this.allMessagesStreamStore.buildKey(client);
      const preexisting = this.messageStreamStore.read(key);

      if (preexisting !== null) {
        warn(`startAllMessagesStream :: stream already exists for ${key}`);
        return true;
      } else {
        try {
          log(`startAllMessagesStream :: creating stream for ${key}`);
          const messageStream = await AllMessagesStream.create(client);
          this.allMessagesStreamStore.write(key, messageStream);
          return true;
        } catch (error) {
          err(
            `startAllMessagesStream :: error starting stream for key ${key}: error: ${error}`
          );
          return false;
        }
      }
    }
  }

  public async addListenerToAllMessagesStream(
    handler: (message: Message) => unknown,
    opts: TargetOpts
  ) {
    log(`addListenerToAllMessagesStream conversation ${JSON.stringify(opts)}`);
    const client = this.getTargetClient(opts);
    if (client === null) {
      warn(
        `addListenerToAllMessagesStream :: no client for ${JSON.stringify(
          opts
        )}`
      );
      return null;
    } else {
      const key = this.allMessagesStreamStore.buildKey(client);
      const preexisting = this.allMessagesStreamStore.read(key);
      if (preexisting === null) {
        warn(`addListenerToAllMessagesStream :: no stream for ${key}`);
        return null;
      } else {
        log(`addListenerToAllMessagesStream :: adding listener to ${key}`);
        return preexisting.addHandler(handler);
      }
    }
  }

  public async startConversationStream(opts: TargetOpts) {
    const client = this.getTargetClient(opts);
    if (client === null) {
      return null;
    } else {
      const key = this.conversationStreamStore.buildKey(client);
      const preexisting = this.messageStreamStore.read(key);

      if (preexisting !== null) {
        return true;
      } else {
        try {
          const conversationStream = await ConversationStream.create(client);
          this.conversationStreamStore.write(key, conversationStream);
          return true;
        } catch (error) {
          err(`startConversationStream :: error starting stream: ${error}`);
          return false;
        }
      }
    }
  }

  public async addListenerToConversationStream(
    handler: (conversation: Conversation) => unknown,
    opts: TargetOpts
  ) {
    const client = this.getTargetClient(opts);
    if (client === null) {
      return null;
    } else {
      const key = this.conversationStreamStore.buildKey(client);
      const preexisting = this.conversationStreamStore.read(key);
      if (preexisting === null) {
        return null;
      } else {
        return preexisting.addHandler(handler);
      }
    }
  }

  private getTargetClient(opts: TargetOpts): Xmtp | null {
    const cached = this.clients[opts.clientAddress];
    if (cached === undefined) {
      return null;
    } else {
      return cached.client;
    }
  }
}

function log(message: string) {
  console.log(`XmtpWorker :: %c${message}`, 'font-style: italic');
}

function warn(message: string) {
  console.log(
    `XmtpWorker :: %c${message}`,
    'font-style: italic, color: yellow'
  );
}

function err(message: string) {
  console.log(`XmtpWorker :: %c${message}`, 'font-style: italic, color: red');
}

/* ****************************************************************************
 *
 *
 *  All Messages Stream Helper Classes
 *
 *
 * ****************************************************************************/

class AllMessageStreamStore {
  private streams: Record<string, AllMessagesStream> = {};

  public read(key: string): AllMessagesStream | null {
    return this.streams[key] || null;
  }

  public write(key: string, messageStream: AllMessagesStream) {
    if (this.streams[key] !== undefined) {
      return null;
    } else {
      this.streams[key] = messageStream;
      return key;
    }
  }

  public buildKey(client: Client) {
    return `${client.address}-all-messages`;
  }
}

class AllMessagesStream {
  private handlers: Record<string, (message: Message) => unknown> = {};

  public constructor(
    public clientAddress: EthAddress,
    private stream: AsyncGenerator<DecodedMessage, unknown, unknown>
  ) {
    this.start();
  }

  public static async create(client: Client) {
    if (!isEthAddress(client.address)) {
      throw new Error('client.address is not an EthAddress');
    } else {
      const stream = await client.conversations.streamAllMessages();
      return new AllMessagesStream(client.address, stream);
    }
  }

  private async start() {
    for await (const message of this.stream) {
      for (const handler of Object.values(this.handlers)) {
        handler(fromXmtpMessage(message));
      }
    }
  }

  public addHandler(handler: (message: Message) => unknown) {
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

/* ****************************************************************************
 *
 *
 *  Message Stream Helper Classes
 *
 *
 * ****************************************************************************/

class MessageStreamStore {
  private streams: Record<string, MessageStream> = {};

  public read(key: string): MessageStream | null {
    return this.streams[key] || null;
  }

  public write(key: string, messageStream: MessageStream) {
    if (this.streams[key] !== undefined) {
      return null;
    } else {
      this.streams[key] = messageStream;
      return key;
    }
  }

  public buildKey(client: Client, conversation: Conversation) {
    return `${client.address}-${conversation.peerAddress}-${conversation.context?.conversationId}`;
  }
}

class MessageStream {
  private handlers: Record<string, (message: Message) => unknown> = {};

  public constructor(
    public clientAddress: EthAddress,
    public conversation: Conversation,
    private stream: Stream<DecodedMessage>
  ) {
    this.start();
  }

  public static async create(client: Client, conversation: Conversation) {
    if (!isEthAddress(client.address)) {
      throw new Error('client.address is not an EthAddress');
    } else {
      const convo = await client.conversations.newConversation(
        conversation.peerAddress,
        conversation.context
      );
      const stream = await convo.streamMessages();
      return new MessageStream(client.address, conversation, stream);
    }
  }

  private async start() {
    for await (const message of this.stream) {
      for (const handler of Object.values(this.handlers)) {
        handler(fromXmtpMessage(message));
      }
    }
  }

  public addHandler(handler: (message: Message) => unknown) {
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

/* ****************************************************************************
 *
 *
 *  Conversation Stream Helper Classes
 *
 *
 * ****************************************************************************/

class ConversationStreamStore {
  private streams: Record<string, ConversationStream> = {};

  public read(key: string): ConversationStream | null {
    return this.streams[key] || null;
  }

  public write(key: string, messageStream: ConversationStream) {
    if (this.streams[key] !== undefined) {
      return null;
    } else {
      this.streams[key] = messageStream;
      return key;
    }
  }

  public buildKey(client: Client) {
    return client.address;
  }
}

class ConversationStream {
  private handlers: Record<string, (conversation: Conversation) => unknown> =
    {};

  public constructor(private stream: Stream<XmtpConversation>) {
    this.start();
  }

  public static async create(client: Client) {
    if (!isEthAddress(client.address)) {
      throw new Error('client.address is not an EthAddress');
    } else {
      const stream = await client.conversations.stream();
      return new ConversationStream(stream);
    }
  }

  private async start() {
    for await (const convo of this.stream) {
      for (const handler of Object.values(this.handlers)) {
        handler(fromXmtpConversation(convo));
      }
    }
  }

  public addHandler(handler: (conversation: Conversation) => unknown) {
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

/* ****************************************************************************
 *
 *
 *  THE WHOLE POINT OF THIS TOWERING PILE
 *
 *
 * ****************************************************************************/

Comlink.expose(XmtpWorker);
