import {
  useConversations,
  useFetchMessages,
  isEthAddress,
  Conversation,
  isMessage,
} from '@relaycc/xmtp-hooks';
import { Wallet } from '@ethersproject/wallet';
import { Auth, ListMessages } from './Core';

const wallet = (() => {
  if (process.env.REACT_APP_TEST_PK === undefined) {
    return Wallet.createRandom();
  } else {
    return new Wallet(process.env.REACT_APP_TEST_PK);
  }
})();
const address = wallet.address;

if (!isEthAddress(address)) {
  throw new Error(`Wallet address ${address} is not a valid Ethereum address`);
}

export const UseConversations = () => {
  const conversations = useConversations({
    clientAddress: address,
    stream: true,
  });
  console.log('conversations', conversations);
  return (
    <main>
      <h2>Conversations</h2>
      <Auth />
      <h3>Status</h3>
      <p>
        {(() => {
          if (conversations.isLoading) {
            return 'Loading...';
          } else if (conversations.isError) {
            return 'Error';
          } else if (
            conversations.data === null ||
            conversations.data === undefined
          ) {
            return 'Null or undefined even though the status is not loading or error';
          } else if (conversations.data.length === 0) {
            return 'No conversations';
          } else {
            return 'Loaded';
          }
        })()}
      </p>
      <h3>List</h3>
      <ul>
        {(() => {
          if (conversations.data === null || conversations.data === undefined) {
            return null;
          } else {
            return conversations.data.map((conversation, i) => (
              <Preview key={i} conversation={conversation} />
            ));
          }
        })()}
      </ul>
    </main>
  );
};

export const Preview = ({ conversation }: { conversation: Conversation }) => {
  const messages = useFetchMessages({
    conversation,
    clientAddress: address,
  });

  const timestamp = (() => {
    const last = messages.data?.[0];
    if (!isMessage(last)) {
      return null;
    } else {
      return last?.sent;
    }
  })();

  return (
    <div>
      <h3>Peer Address</h3>
      <p>{conversation.peerAddress}</p>
      <h4>Conversation ID</h4>
      <p>{conversation.context?.conversationId || 'No conversation id...'}</p>
      <h4>Timestamp</h4>
      <p>
        {(() => {
          if (messages.isLoading) {
            return 'Loading...';
          } else if (messages.isError) {
            return 'Error';
          } else if (timestamp === null || timestamp === undefined) {
            return 'No timestamp';
          } else {
            return new Date(timestamp).toLocaleString();
          }
        })()}
      </p>
    </div>
  );
};
