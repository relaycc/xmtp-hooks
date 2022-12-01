import { wrap, Remote, proxy } from 'comlink';
import { IXmtpWorker, TargetOpts } from './xmtp-worker-interface';
import { Wallet, ClientOptions, isIdentityWallet } from '../../../lib';
import { XmtpClient } from './xmtp-client';

type XmtpWorkerClass = IXmtpWorker & {
  new (): IXmtpWorker;
};

export class XmtpWorkerClient {
  private worker: Promise<Remote<IXmtpWorker>>;

  public constructor(worker: Worker) {
    this.worker = (async () => {
      const MyWorkerClass = wrap<XmtpWorkerClass>(worker);
      return new MyWorkerClass();
    })();
  }

  // TODO - This should not return an "identity wallet" but an XMTP identity instead.
  public async createIdentity() {
    const worker = await this.worker;
    return worker.createIdentity();
  }

  public async startClient(
    wallet: Wallet,
    opts?: Partial<ClientOptions>
  ): Promise<XmtpClient | null> {
    const worker = await this.worker;
    console.log(
      'XmtpWorkerClient :: startClient :: About to call to the worker'
    );
    const xmtp = await worker.startClient(
      (() => {
        if (isIdentityWallet(wallet)) {
          return wallet;
        } else {
          return proxy(wallet);
        }
      })(),
      opts
    );
    console.log(
      'XmtpWorkerClient :: startClient :: Got the xmtp client from the worker'
    );
    if (xmtp === null) {
      return null;
    } else {
      return new XmtpClient({
        worker,
        opts: { clientAddress: xmtp.address },
      });
    }
  }

  public async stopClient(opts: TargetOpts) {
    const worker = await this.worker;
    return worker.stopClient(opts);
  }

  public async fetchClient(opts: TargetOpts) {
    const worker = await this.worker;
    const result = await worker.fetchClient(opts);
    if (result === null) {
      return null;
    } else {
      return new XmtpClient({
        worker,
        opts: { clientAddress: result.address },
      });
    }
  }
}
