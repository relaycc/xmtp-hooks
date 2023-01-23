import { wrap, Remote, proxy } from 'comlink';
import { IXmtpWorker, TargetOpts } from './xmtp-worker-interface';
import { Wallet, ClientOptions, isIdentityWallet } from '../../../lib';
import { XmtpClient } from './xmtp-client';

type XmtpWorkerClass = IXmtpWorker & {
  new (): IXmtpWorker;
};

const WRAPPED: {
  worker: Promise<Remote<IXmtpWorker>> | null;
} = {
  worker: null,
};

export class XmtpWorkerClient {
  private worker: Promise<Remote<IXmtpWorker>>;

  public constructor(worker: Worker) {
    /* WARNING :: It is very important that we only every instantiate one
     * wrapper. If we instantiate more than each one will have its own instance
     * variables. */

    if (WRAPPED.worker === null) {
      const MyWorkerClass = wrap<XmtpWorkerClass>(worker);
      WRAPPED.worker = new MyWorkerClass();
    }
    this.worker = WRAPPED.worker;
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
          console.log(
            'XmtpWorkerClient :: startClient :: wallet is an identity wallet'
          );
          return wallet;
        } else {
          console.log(
            'XmtpWorkerClient :: startClient :: wallet is a Signer wallet'
          );
          return proxy(wallet);
        }
      })(),
      opts
    );
    if (xmtp === null || xmtp === undefined) {
      console.log(
        'XmtpWorkerClient :: startClient :: The xmtp client from the work was null.'
      );
      return null;
    } else {
      console.log(
        'XmtpWorkerClient :: startClient :: Got the xmtp client from the worker'
      );
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
    if (result === null || result === undefined) {
      console.log('XmtpWorkerClient :: fetchClient :: result is null');
      return null;
    } else {
      console.log(
        `XmtpWorkerClient :: fetchClient :: got a client with address ${result.address}`
      );
      return new XmtpClient({
        worker,
        opts: { clientAddress: result.address },
      });
    }
  }
}
