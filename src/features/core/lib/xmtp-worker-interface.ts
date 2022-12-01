import {
  IdentityWallet,
  ListMessagesOptions,
  SendOptions,
  Message,
  Conversation,
  Wallet,
  Client,
  ClientOptions,
  EthAddress,
} from '../../../lib';

/* We define the XmtpWorker's interface in a separate file so that we can avoid
 * exporting anything from the XmtpWorker file. Adding exports to the WebWorker
 * adds a small amount of complexity to the build process that I don't know much
 * about and would rather just avoid for now. */

export interface TargetOpts {
  clientAddress: EthAddress;
}

export interface IXmtpWorker {
  createIdentity(): Promise<IdentityWallet | null>;
  startClient(
    wallet: Wallet,
    opts?: Partial<ClientOptions>
  ): Promise<Client | null>;
  stopClient(opts: TargetOpts): Promise<Client | null>;
  fetchClient(opts: TargetOpts): Promise<Client | null>;
  fetchMessages(
    conversation: Conversation,
    opts: Partial<ListMessagesOptions> | TargetOpts
  ): Promise<Message[] | null>;
  readValue(key: string, opts: TargetOpts): Promise<unknown>;
  writeValue(key: string, value: unknown, opts: TargetOpts): Promise<unknown>;
  fetchConversations(opts: TargetOpts): Promise<Conversation[] | null>;
  fetchPeerOnNetwork(
    peerAddress: EthAddress,
    opts: TargetOpts
  ): Promise<boolean | null>;
  sendMessage(
    conversation: Conversation,
    message: unknown,
    opts: Partial<SendOptions> | TargetOpts
  ): Promise<Message | null>;
  startMessageStream(
    conversation: Conversation,
    opts: TargetOpts
  ): Promise<boolean | null>;
  addListenerToMessageStream(
    conversation: Conversation,
    handler: (message: Message) => unknown,
    opts: TargetOpts
  ): Promise<string | null>;
  startConversationStream(opts: TargetOpts): Promise<boolean | null>;
  addListenerToConversationStream(
    handler: (conversation: Conversation) => unknown,
    opts: TargetOpts
  ): Promise<string | null>;
}
