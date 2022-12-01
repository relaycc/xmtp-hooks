import {
  ListMessagesOptions,
  SendOptions,
  Message,
  Conversation,
  EthAddress,
} from '../../../lib';
import { IXmtpWorker, TargetOpts } from './xmtp-worker-interface';
import { Remote, proxy } from 'comlink';

export type XmtpClientOpts = TargetOpts;

export class XmtpClient {
  private worker: Remote<IXmtpWorker>;
  private opts: XmtpClientOpts;

  public constructor({
    worker,
    opts,
  }: {
    worker: Remote<IXmtpWorker>;
    opts: XmtpClientOpts;
  }) {
    this.worker = worker;
    this.opts = opts;
  }

  public address(): EthAddress {
    return this.opts.clientAddress;
  }

  public async fetchMessages(
    conversation: Conversation,
    opts?: Partial<ListMessagesOptions>
  ): Promise<Message[] | null> {
    return this.worker.fetchMessages(conversation, { ...opts, ...this.opts });
  }

  public async readValue(key: string) {
    return this.worker.readValue(key, this.opts);
  }

  public async writeValue(key: string, value: unknown) {
    return this.worker.writeValue(key, value, this.opts);
  }

  public async fetchConversations(): Promise<Conversation[] | null> {
    return this.worker.fetchConversations(this.opts);
  }

  public async fetchPeerOnNetwork(
    peerAddress: EthAddress
  ): Promise<boolean | null> {
    return this.worker.fetchPeerOnNetwork(peerAddress, this.opts);
  }

  public async sendMessage(
    conversation: Conversation,
    content: unknown,
    opts?: Partial<SendOptions>
  ): Promise<Message | null> {
    return this.worker.sendMessage(conversation, content, {
      ...opts,
      ...this.opts,
    });
  }

  public async startMessageStream(conversation: Conversation) {
    return this.worker.startMessageStream(conversation, this.opts);
  }

  public async addListenerToMessageStream(
    conversation: Conversation,
    handler: (message: Message) => unknown
  ) {
    return this.worker.addListenerToMessageStream(
      conversation,
      proxy(handler),
      this.opts
    );
  }

  public async startConversationStream() {
    return this.worker.startConversationStream(this.opts);
  }

  public async addListenerToConversationStream(
    handler: (conversation: Conversation) => unknown
  ) {
    return this.worker.addListenerToConversationStream(
      proxy(handler),
      this.opts
    );
  }
}
