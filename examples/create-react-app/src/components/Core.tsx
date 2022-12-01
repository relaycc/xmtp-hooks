import { useState } from 'react';
import {
  isEthAddress,
  useStartClient,
  useStopClient,
  useXmtpClient,
  useFetchConversations,
  useSendMessage,
  Conversation,
  useFetchMessages,
  useFetchPeerOnNetwork,
  useMessageStream,
  useConversationStream,
  useReadValue,
  useWriteValue,
  EthAddress,
  Message,
} from '@relaycc/xmtp-hooks';
import { Link, useLocation } from 'react-router-dom';
import { Wallet } from '@ethersproject/wallet';

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

export const Core = () => {
  const location = useLocation();
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  return (
    <main>
      <h1>Core Features</h1>
      <nav>
        <Link to="/core/auth">Auth</Link>
        <Link to="/core/send-a-message">Send a Message</Link>
        <Link to="/core/list-conversations">List Conversations</Link>
        <Link to="/core/list-messages">List Messages</Link>
        <Link to="/core/peer-on-network">Peer Status</Link>
        <Link to="/core/stream-messages">Stream Messages</Link>
        <Link to="/core/stream-conversations">Stream Conversations</Link>
        <Link to="/core/key-value">Key Value Store</Link>
      </nav>
      {(() => {
        if (location.pathname !== '/core/auth') {
          return null;
        } else {
          return <Auth />;
        }
      })()}
      {(() => {
        if (location.pathname !== '/core/send-a-message') {
          return null;
        } else {
          return <SendAMessage />;
        }
      })()}
      {(() => {
        if (location.pathname !== '/core/list-conversations') {
          return null;
        } else {
          return (
            <ListConversations onClickConversation={setSelectedConversation} />
          );
        }
      })()}
      {(() => {
        if (location.pathname !== '/core/list-messages') {
          return null;
        } else {
          if (selectedConversation === null) {
            return <h2>No Conversation Selected</h2>;
          } else {
            return <ListMessages conversation={selectedConversation} />;
          }
        }
      })()}
      {(() => {
        if (location.pathname !== '/core/peer-on-network') {
          return null;
        } else {
          return <PeerOnNetwork />;
        }
      })()}
      {(() => {
        if (location.pathname !== '/core/stream-messages') {
          return null;
        } else {
          if (selectedConversation === null) {
            return <h2>No Conversation Selected</h2>;
          } else {
            return <StreamMessages conversation={selectedConversation} />;
          }
        }
      })()}
      {(() => {
        if (location.pathname !== '/core/stream-conversations') {
          return null;
        } else {
          return <StreamConversations />;
        }
      })()}
    </main>
  );
};

export const Auth = () => {
  const startClient = useStartClient({});
  const stopClient = useStopClient({});
  const client = useXmtpClient({ clientAddress: address });

  return (
    <div>
      <h2>Sign In</h2>
      <button
        disabled={client.data !== null && client.data !== undefined}
        onClick={() => {
          startClient.mutate({ wallet, opts: { env: 'production' } });
        }}>
        {(() => {
          if (startClient.isLoading) {
            return 'Signing in...';
          } else if (startClient.isError) {
            return 'Failed to Sign In';
          } else {
            return 'Sign In';
          }
        })()}
      </button>
      <h2>Sign Out</h2>
      <button
        disabled={client.data === null || client.data === undefined}
        onClick={() => {
          stopClient.mutate({ clientAddress: address });
        }}>
        {(() => {
          if (startClient.isLoading) {
            return 'Signing Out...';
          } else if (startClient.isError) {
            return 'Failed to Sign Out';
          } else {
            return 'Sign Out';
          }
        })()}
      </button>
      <h2>Client Status</h2>
      <h3>Network</h3>
      <p>TODO</p>
      <h3>Loading</h3>
      <p>{`${client.isLoading}`}</p>
      <h3>Fetching</h3>
      <p>{`${client.isFetching}`}</p>
      <h3>Success</h3>
      <p>{`${client.isSuccess}`}</p>
      <h3>Signed In As</h3>
      <p>
        {(() => {
          if (client.data !== undefined && client.data !== null) {
            return `${client.data.address()}`;
          } else {
            return 'Not Signed In';
          }
        })()}
      </p>
    </div>
  );
};

const SendAMessage = () => {
  const sendMessage = useSendMessage({ clientAddress: address });
  const client = useXmtpClient({ clientAddress: address });
  const [inputVal, setInputVal] = useState<string | null>(null);

  return (
    <div>
      <h2>Send a Message</h2>
      <textarea
        value={inputVal || ''}
        onChange={(e) => setInputVal(e.target.value)}
      />
      <button
        disabled={
          client.data === undefined ||
          client.data === null ||
          sendMessage.isLoading ||
          sendMessage.isError
        }
        onClick={() => {
          sendMessage.mutate({
            conversation: {
              peerAddress: '0xf89773CF7cf0B560BC5003a6963b98152D84A15a',
              context: {
                conversationId: 'github.com/relaycc/xmtp-hooks/examples',
                metadata: {},
              },
            },
            content: inputVal || 'Hello from xmtp-hooks example app!',
          });
        }}>
        Send a message to the maintainer!
      </button>
      <button
        disabled={
          client.data === undefined ||
          client.data === null ||
          sendMessage.isLoading ||
          sendMessage.isError
        }
        onClick={() => {
          sendMessage.mutate({
            conversation: {
              peerAddress: '0x0cb27e883E207905AD2A94F9B6eF0C7A99223C37',
              context: {
                conversationId: 'github.com/relaycc/xmtp-hooks/examples',
                metadata: {},
              },
            },
            content: inputVal || 'Hello from xmtp-hooks example app!',
          });
        }}>
        Or to the Relay founder!
      </button>
      <h3>Last Message Sent</h3>
      <h4>To Peer Address</h4>
      <p>
        {(() => {
          if (sendMessage.data?.conversation.peerAddress === undefined) {
            return 'No Message Sent';
          } else {
            return sendMessage.data?.conversation.peerAddress;
          }
        })()}
      </p>
      <h4>Message Content</h4>
      <p>
        {(() => {
          if (sendMessage.data?.content === undefined) {
            return 'No Message Sent';
          } else {
            return `${sendMessage.data?.content}`;
          }
        })()}
      </p>
    </div>
  );
};

const ListConversations = ({
  onClickConversation,
}: {
  onClickConversation: (conversation: Conversation) => unknown;
}) => {
  const conversations = useFetchConversations({ clientAddress: address });
  return (
    <div>
      <h2>List Conversations</h2>
      <button
        onClick={() => {
          conversations.refetch();
        }}>
        Refresh
      </button>
      {(() => {
        if (conversations.isWaiting) {
          return 'Waiting for XMTP Client';
        } else if (conversations.isLoading) {
          return 'Loading Conversations...';
        } else if (conversations.isError) {
          return 'Failed to Load Conversations';
        } else if (
          conversations.data === null ||
          conversations.data === undefined
        ) {
          return 'Conversations fetch returned null or undefined';
        } else if (conversations.data.length === 0) {
          return 'No Conversations';
        } else {
          return (
            <ul>
              {conversations.data?.map((conversation, i) => {
                return (
                  <li
                    key={`${conversation.peerAddress}/
                      ${conversation.context?.conversationId}/${i}`}>
                    <button onClick={() => onClickConversation(conversation)}>
                      Select Conversation
                    </button>
                    <h3>Peer Address</h3>
                    <p>{conversation.peerAddress}</p>
                    <h4>Conversation ID</h4>
                    <p>
                      {(() => {
                        if (
                          conversation.context?.conversationId === undefined
                        ) {
                          return 'No Conversation ID';
                        } else {
                          return conversation.context?.conversationId;
                        }
                      })()}
                    </p>
                  </li>
                );
              })}
            </ul>
          );
        }
      })()}
    </div>
  );
};

const ListMessages = ({ conversation }: { conversation: Conversation }) => {
  const messages = useFetchMessages({
    conversation,
    clientAddress: address,
  });

  return (
    <div>
      {(() => {
        if (messages.isWaiting) {
          return 'Waiting for XMTP Client';
        } else if (messages.isLoading) {
          return 'Loading Messages...';
        } else if (messages.isError) {
          return 'Failed to Load Messages';
        } else if (messages.data === null || messages.data === undefined) {
          return 'Messages fetch returned null or undefined';
        } else if (messages.data.length === 0) {
          return 'No Messages';
        } else {
          return (
            <>
              <h2>List Messages</h2>
              <h3>Peer Address</h3>
              <p>{conversation.peerAddress}</p>
              <h4>Conversation ID</h4>
              <p>
                {conversation.context?.conversationId ||
                  'No conversation id...'}
              </p>
              <h3>Messages:</h3>
              <ul>
                {messages.data?.map((message) => {
                  return (
                    <li key={message.id}>
                      <time>{`${message.sent}`}</time>
                      <p>{`${message.content}`}</p>
                    </li>
                  );
                })}
              </ul>
            </>
          );
        }
      })()}
    </div>
  );
};

const PeerOnNetwork = () => {
  const [inputVal, setInputVal] = useState<string | null>(null);
  const [peerAddresses, setPeerAddresses] = useState<EthAddress[]>([
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    '0x2BeFb4C92c3Af21107165CA4B7C230A3615201eB',
    '0xf89773CF7cf0B560BC5003a6963b98152D84A15a',
  ]);
  return (
    <div>
      <h2>Fetch Peer Status</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isEthAddress(inputVal)) {
            if (!peerAddresses.includes(inputVal)) {
              setPeerAddresses([...peerAddresses, inputVal]);
            }
            setInputVal(null);
          }
        }}>
        <input
          type="text"
          onChange={(e) => {
            setInputVal(e.target.value);
          }}
          value={inputVal || ''}
        />
      </form>
      <ul>
        {peerAddresses.map((peerAddress) => {
          return <PeerStatus peerAddress={peerAddress} />;
        })}
      </ul>
    </div>
  );
};

const PeerStatus = ({ peerAddress }: { peerAddress: EthAddress }) => {
  const peerOnNetwork = useFetchPeerOnNetwork({
    clientAddress: address,
    peerAddress,
  });

  return (
    <>
      <h3>Peer Address</h3>
      <p>{peerAddress || 'Peer Address Not Set'}</p>
      <h3>Peer Is On XMTP Network?</h3>
      <p>
        {(() => {
          if (peerOnNetwork.isWaiting) {
            return 'Waiting...';
          } else if (peerOnNetwork.isLoading) {
            return 'Fetching Peer Status...';
          } else if (peerOnNetwork.isError) {
            return 'Failed to Fetch Peer Status';
          } else if (
            peerOnNetwork.data === null ||
            peerOnNetwork.data === undefined
          ) {
            return 'Peer Status fetch returned null or undefined';
          } else {
            if (peerOnNetwork.data) {
              return 'Yes';
            } else {
              return 'No';
            }
          }
        })()}
      </p>
    </>
  );
};

const StreamMessages = ({ conversation }: { conversation: Conversation }) => {
  const [streamedMessages, setStreamedMessages] = useState<
    Record<string, Message>
  >({});

  useMessageStream({
    clientAddress: address,
    conversation,
    listener: (message) => {
      setStreamedMessages((prev) => {
        return { ...prev, [message.id]: message };
      });
    },
  });

  return (
    <div>
      <h2>Streamed Messages</h2>
      <h3>Peer Address</h3>
      <p>{conversation.peerAddress}</p>
      <h4>Conversation ID</h4>
      <p>{conversation.context?.conversationId || 'No conversation id...'}</p>
      <h3>Messages:</h3>
      {(() => {
        if (Object.values(streamedMessages).length === 0) {
          return 'No Messages';
        } else {
          return (
            <>
              <ul>
                {Object.values(streamedMessages).map((message) => {
                  return (
                    <li key={message.id}>
                      <time>{`${message.sent}`}</time>
                      <p>{`${message.content}`}</p>
                    </li>
                  );
                })}
              </ul>
            </>
          );
        }
      })()}
    </div>
  );
};

const StreamConversations = () => {
  const [streamedConversations, setStreamedConversations] = useState<
    Record<string, Conversation>
  >({});

  useConversationStream({
    clientAddress: address,
    listener: (conversation) => {
      setStreamedConversations((prev) => {
        return {
          ...prev,
          [conversation.peerAddress + conversation.context?.conversationId]:
            conversation,
        };
      });
    },
  });

  return (
    <div>
      <h2>Streamed Conversations:</h2>
      <ul>
        {Object.values(streamedConversations).map((conversation, i) => {
          return (
            <li
              key={`${conversation.peerAddress}/
                      ${conversation.context?.conversationId}/${i}`}>
              <h3>Peer Address</h3>
              <p>{conversation.peerAddress}</p>
              <h4>Conversation ID</h4>
              <p>
                {(() => {
                  if (conversation.context?.conversationId === undefined) {
                    return 'No Conversation ID';
                  } else {
                    return conversation.context?.conversationId;
                  }
                })()}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
