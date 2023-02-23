import { useMemo, useState, useEffect } from "react";
import { create } from "zustand";
import * as Comlink from "comlink";
import { Signer } from "@ethersproject/abstract-signer";
import {
  Xmtp,
  Conversation,
  Message,
  Preview,
  insertMessagesIfNew,
  insertOrUpdatePreviews,
  getNextPageOptions,
  sortByMostRecentPreview,
  uniqueConversationKey,
  ClientOptions,
} from "./lib";
import XmtpWorker from "./worker?worker&inline";
import { SortDirection } from "@relaycc/xmtp-js";

/* **************************************************************************
 *
 *
 *
 *
 *
 *
 * useXmtpStore
 *
 *
 *
 *
 *
 * *************************************************************************/

type Transition = [AsyncState<unknown>["id"], AsyncState<unknown>["id"]];

const VALID_TRANSITIONS: Transition[] = [
  ["idle", "pending"],
  ["idle", "success"],
  ["idle", "error"],
  ["pending", "idle"],
  ["pending", "success"],
  ["pending", "error"],
  ["success", "idle"],
  ["error", "idle"],
  ["error", "pending"],
];

const isValidTransition = (transition: Transition) => {
  return Boolean(
    VALID_TRANSITIONS.find(([prev, next]) => {
      return prev === transition[0] && next === transition[1];
    })
  );
};

const useXmtpStore = create<{
  xmtp: AsyncState<{
    address: string;
    env?: string;
    export?: string;
    worker: Comlink.Remote<Xmtp>;
  }>;
  setXmtp: (
    xmtp: AsyncState<{
      address: string;
      env?: string;
      export?: string;
      worker: Comlink.Remote<Xmtp>;
    }>
  ) => void;
}>((set) => ({
  xmtp: { id: "idle" },
  setXmtp: async (val) =>
    set(({ xmtp }) => {
      const transition: Transition = [xmtp.id, val.id];
      if (!isValidTransition(transition)) {
        return { xmtp };
      } else {
        return { xmtp: val };
      }
    }),
}));

/* **************************************************************************
 *
 *
 *
 *
 *
 *
 * useXmtp
 *
 *
 *
 *
 *
 * *************************************************************************/

export const useXmtp = ({
  wallet,
  opts,
}: {
  wallet?: Signer | null;
  opts?: Partial<ClientOptions>;
}) => {
  /* **************************************************************************
   *
   * Client
   *
   * *************************************************************************/

  const { xmtp, setXmtp } = useXmtpStore();

  const isClientIdle = xmtp.id === "idle";
  const isClientPending = xmtp.id === "pending";
  const isClientSuccess = xmtp.id === "success";
  const isClientError = xmtp.id === "error";

  const isStartClientReady =
    (isClientIdle || isClientError) &&
    (wallet !== null || typeof opts?.privateKeyOverride === "string");

  const startClient = useMemo(() => {
    if (!isStartClientReady) {
      return null;
    } else {
      return async () => {
        try {
          setXmtp({ id: "pending" });
          const worker = Comlink.wrap<Xmtp>(new XmtpWorker());
          const client = await worker.startClient(
            (() => {
              if (wallet === null) {
                return null;
              } else {
                return Comlink.proxy(wallet);
              }
            })(),
            opts
          );
          setXmtp({
            id: "success",
            data: {
              ...client,
              worker,
            },
          });
        } catch (error) {
          setXmtp({ id: "error", error });
        }
      };
    }
  }, [xmtp.id, wallet, opts]);

  const stopClient: Xmtp["stopClient"] | null = useMemo(() => {
    if (!isClientSuccess) {
      return null;
    } else {
      return async () => {
        setXmtp({ id: "idle" });
        return true;
      };
    }
  }, [xmtp.id]);

  /* **************************************************************************
   *
   * Actions
   *
   * *************************************************************************/

  const fetchConversations: Xmtp["fetchConversations"] | null = useMemo(() => {
    if (!isClientSuccess) {
      return null;
    } else {
      return xmtp.data.worker.fetchConversations;
    }
  }, [xmtp]);

  const fetchMessages: Xmtp["fetchMessages"] | null = useMemo(() => {
    if (!isClientSuccess) {
      return null;
    } else {
      return async ({ conversation, opts }) => {
        return await xmtp.data.worker.fetchMessages({ conversation, opts });
      };
    }
  }, [xmtp]);

  const fetchPeerOnNetwork: Xmtp["fetchPeerOnNetwork"] | null = useMemo(() => {
    if (!isClientSuccess) {
      return null;
    } else {
      return xmtp.data.worker.fetchPeerOnNetwork;
    }
  }, [xmtp]);

  const sendMessage: Xmtp["sendMessage"] | null = useMemo(() => {
    if (!isClientSuccess) {
      return null;
    } else {
      return xmtp.data.worker.sendMessage;
    }
  }, [xmtp]);

  const startStreamingMessages: Xmtp["startStreamingMessages"] | null =
    useMemo(() => {
      if (!isClientSuccess) {
        return null;
      } else {
        return xmtp.data.worker.startStreamingMessages;
      }
    }, [xmtp]);

  const stopStreamingMessages: Xmtp["stopStreamingMessages"] | null =
    useMemo(() => {
      if (!isClientSuccess) {
        return null;
      } else {
        return xmtp.data.worker.stopStreamingMessages;
      }
    }, [xmtp]);

  const listenToStreamingMessages: Xmtp["listenToStreamingMessages"] | null =
    useMemo(() => {
      if (!isClientSuccess) {
        return null;
      } else {
        return async (conversation, handler) => {
          return await xmtp.data.worker.listenToStreamingMessages(
            conversation,
            Comlink.proxy(handler)
          );
        };
      }
    }, [xmtp]);

  const startStreamingConversations:
    | Xmtp["startStreamingConversations"]
    | null = useMemo(() => {
    if (!isClientSuccess) {
      return null;
    } else {
      return xmtp.data.worker.startStreamingConversations;
    }
  }, [xmtp]);

  const stopStreamingConversations: Xmtp["stopStreamingConversations"] | null =
    useMemo(() => {
      if (!isClientSuccess) {
        return null;
      } else {
        return xmtp.data.worker.stopStreamingConversations;
      }
    }, [xmtp]);

  const listenToStreamingConversations:
    | Xmtp["listenToStreamingConversations"]
    | null = useMemo(() => {
    if (!isClientSuccess) {
      return null;
    } else {
      return async (handler) => {
        return await xmtp.data.worker.listenToStreamingConversations(
          Comlink.proxy(handler)
        );
      };
    }
  }, [xmtp]);

  const startStreamingAllMessages: Xmtp["startStreamingAllMessages"] | null =
    useMemo(() => {
      if (!isClientSuccess) {
        return null;
      } else {
        return xmtp.data.worker.startStreamingAllMessages;
      }
    }, [xmtp]);

  const stopStreamingAllMessages: Xmtp["stopStreamingAllMessages"] | null =
    useMemo(() => {
      if (!isClientSuccess) {
        return null;
      } else {
        return xmtp.data.worker.stopStreamingAllMessages;
      }
    }, [xmtp]);

  const listenToStreamingAllMessages:
    | Xmtp["listenToStreamingAllMessages"]
    | null = useMemo(() => {
    if (!isClientSuccess) {
      return null;
    } else {
      return async (handler) => {
        return await xmtp.data.worker.listenToStreamingAllMessages(
          Comlink.proxy(handler)
        );
      };
    }
  }, [xmtp]);

  return {
    startClient,
    stopClient,
    isClientIdle,
    isClientPending,
    isClientSuccess,
    isClientError,
    client: xmtp.data,
    clientError: xmtp.error,
    fetchConversations,
    fetchMessages,
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
  };
};

/* **************************************************************************
 *
 *
 *
 *
 *
 *
 * useMessagesStore
 *
 *
 *
 *
 *
 * *************************************************************************/

const useMessagesStore = create<Record<string, AsyncState<Message[]>>>(
  () => ({})
);

type Identity<T> = (x: T) => T;

export const useMessages = ({
  conversation,
}: {
  conversation: Conversation;
}) => {
  const key = uniqueConversationKey(conversation);
  const messages = useMessagesStore((state) => state[key]) || { id: "idle" };

  const setMessages = (
    input: AsyncState<Message[]> | Identity<AsyncState<Message[]>>
  ) => {
    useMessagesStore.setState((state) => {
      return {
        ...state,
        [key]: typeof input === "function" ? input(state[key]) : input,
      };
    });
  };

  return [messages, setMessages] as const;
};

/* **************************************************************************
 *
 *
 *
 *
 *
 *
 * useStreamingStore
 *
 *
 *
 *
 *
 * *************************************************************************/

const useStreamingStore = create<Record<string, AsyncState<boolean>>>(
  () => ({})
);

export const useStreaming = ({
  conversation,
}: {
  conversation: Conversation;
}) => {
  const key = uniqueConversationKey(conversation);
  const streaming = useStreamingStore((state) => state[key]) || { id: "idle" };

  const setStreaming = (
    input: AsyncState<boolean> | Identity<AsyncState<boolean>>
  ) => {
    useStreamingStore.setState((state) => {
      return {
        ...state,
        [key]: typeof input === "function" ? input(state[key]) : input,
      };
    });
  };

  return [streaming, setStreaming] as const;
};

/* **************************************************************************
 *
 *
 *
 *
 *
 *
 * useConversation
 *
 *
 *
 *
 *
 * *************************************************************************/

export const useConversation = ({
  wallet,
  opts,
  conversation,
}: {
  wallet?: Signer | null;
  opts?: Partial<ClientOptions>;
  conversation: Conversation;
}) => {
  const {
    startClient,
    isClientIdle,
    isClientPending,
    isClientSuccess,
    isClientError,
    client,
    clientError,
    fetchMessages,
    fetchPeerOnNetwork,
    startStreamingMessages,
    stopStreamingMessages,
    listenToStreamingMessages,
    sendMessage,
  } = useXmtp({ wallet, opts });

  /* **************************************************************************
   *
   * Messages
   *
   * *************************************************************************/

  const [messages, setMessages] = useMessages({ conversation });

  const isMessagesIdle = messages.id === "idle";
  const isMessagesPending = messages.id === "pending";
  const isMessagesError = messages.id === "error";
  const isMessagesFetching = messages.id === "fetching";
  const isMessagesSuccess = messages.id === "success";

  useEffect(() => {
    if (!isMessagesIdle || fetchMessages === null || conversation === null) {
      return;
    } else {
      (async () => {
        try {
          setMessages({ id: "pending" });
          const messages = await fetchMessages({
            conversation,
            opts: getNextPageOptions({}),
          });
          setMessages({ id: "success", data: messages });
        } catch (error) {
          setMessages({ id: "error", error });
        }
      })();
    }
  }, [fetchMessages, conversation]);

  const fetchMoreMessages = useMemo(() => {
    if (!isMessagesSuccess || fetchMessages === null || conversation === null) {
      return null;
    } else {
      return async () => {
        try {
          setMessages((prev) => {
            if (prev.id !== "success") {
              return prev;
            } else {
              return {
                id: "fetching",
                data: prev.data,
              };
            }
          });
          const newMessages = await fetchMessages({
            conversation,
            opts: getNextPageOptions({ messages: messages.data }),
          });
          setMessages((prev) => {
            if (prev.id !== "fetching") {
              return prev;
            } else {
              return {
                id: "success",
                data: insertMessagesIfNew({
                  messages: prev.data,
                  newMessages,
                }),
              };
            }
          });
        } catch (error) {
          setMessages((prev) => {
            if (prev.id !== "fetching") {
              return prev;
            } else {
              return {
                id: "error",
                error,
              };
            }
          });
        }
      };
    }
  }, [fetchMessages, messages]);

  /* **************************************************************************
   *
   * Streaming
   *
   * *************************************************************************/

  const [streaming, setStreaming] = useStreaming({ conversation });

  const isStreamingIdle = streaming.id === "idle";
  const isStreamingPending = streaming.id === "pending";
  const isStreamingError = streaming.id === "error";
  const isStreamingSuccess = streaming.id === "success";

  useEffect(() => {
    if (
      !isStreamingIdle ||
      startStreamingMessages === null ||
      stopStreamingMessages === null ||
      listenToStreamingMessages === null ||
      conversation === null
    ) {
      return;
    } else {
      (async () => {
        try {
          setStreaming({ id: "pending" });
          await startStreamingMessages({ conversation });
          await listenToStreamingMessages(conversation, (message) => {
            setMessages((prev) => {
              if (prev.id === "error") {
                return prev;
              } else {
                return {
                  id: "success",
                  data: insertMessagesIfNew({
                    messages: prev.data || [],
                    newMessages: [message],
                  }),
                };
              }
            });
          });
          setStreaming({ id: "success", data: true });
          return () => {
            stopStreamingMessages({ conversation });
          };
        } catch (error) {
          setStreaming({ id: "error", error });
        }
      })();
    }
  }, [streaming.id, startStreamingMessages]);

  /* **************************************************************************
   *
   * Peer On Network
   *
   * *************************************************************************/

  const [peerOnNetwork, setPeerOnNetwork] = useState<AsyncState<boolean>>({
    id: "idle",
  });

  const isPeerOnNetworkIdle = peerOnNetwork.id === "idle";
  const isPeerOnNetworkPending = peerOnNetwork.id === "pending";
  const isPeerOnNetworkError = peerOnNetwork.id === "error";
  const isPeerOnNetworkSuccess = peerOnNetwork.id === "success";

  useEffect(() => {
    if (
      !isPeerOnNetworkIdle ||
      fetchPeerOnNetwork === null ||
      conversation === null
    ) {
      return;
    } else {
      (async () => {
        try {
          setPeerOnNetwork({ id: "pending" });
          const result = await fetchPeerOnNetwork(conversation);
          setPeerOnNetwork({ id: "success", data: result });
        } catch (error) {
          setPeerOnNetwork({ id: "error", error });
        }
      })();
    }
  }, [fetchPeerOnNetwork]);

  /* **************************************************************************
   *
   * Send A Message
   *
   * *************************************************************************/

  const [sentMessages, setSentMessages] = useState<AsyncStateArray<Message>>(
    []
  );

  const isSending = useMemo(() => {
    return sentMessages.some((sentMessage) => sentMessage.id === "pending");
  }, [sentMessages]);

  const send = useMemo(() => {
    if (
      peerOnNetwork.data !== true ||
      sendMessage === null ||
      conversation === null
    ) {
      return null;
    } else {
      return async ({ content }: { content: unknown }) => {
        const uuid = `${Math.random()}${Math.random()}${Math.random()}${
          Math.random
        }`;
        try {
          setSentMessages((prev) => [...prev, { id: "pending", uuid }]);
          // TODO OPTS
          const sent = await sendMessage({ conversation, content });
          setMessages((prev) => {
            if (prev.id !== "success" && prev.id !== "fetching") {
              return prev;
            } else {
              return {
                id: prev.id,
                data: insertMessagesIfNew({
                  messages: prev.data || [],
                  newMessages: [sent],
                }),
              };
            }
          });
          setSentMessages((prev) => {
            return prev.map((sentMessage) => {
              if (sentMessage.uuid !== uuid) {
                return sentMessage;
              } else {
                return { id: "success", uuid, data: sent };
              }
            });
          });
        } catch (error) {
          return setSentMessages((prev) => {
            return prev.map((sentMessage) => {
              if (sentMessage.uuid !== uuid) {
                return sentMessage;
              } else {
                return { id: "error", uuid, error };
              }
            });
          });
        }
      };
    }
  }, [sendMessage, peerOnNetwork.data, conversation]);

  /* **************************************************************************
   *
   * Conversation
   *
   * *************************************************************************/

  return {
    conversation,
    startClient,
    isClientIdle,
    isClientPending,
    isClientError,
    isClientSuccess,
    clientError,
    client,
    isMessagesIdle,
    isMessagesPending,
    isMessagesError,
    isMessagesSuccess,
    isMessagesFetching,
    messagesError: messages.error,
    messages: messages.data,
    fetchMoreMessages,
    isPeerOnNetworkIdle,
    isPeerOnNetworkPending,
    isPeerOnNetworkError,
    isPeerOnNetworkSuccess,
    isPeerOnNetwork: peerOnNetwork.data,
    peerOnNetworkError: peerOnNetwork.error,
    isStreamingIdle,
    isStreamingPending,
    isStreamingError,
    isStreamingSuccess,
    isStreaming: streaming.data,
    streamingError: streaming.error,
    isSending,
    send,
  };
};

/* **************************************************************************
 *
 *
 *
 *
 *
 *
 * usePreviews
 *
 *
 *
 *
 *
 * *************************************************************************/

export const usePreviews = ({
  wallet,
  opts,
}: {
  wallet?: Signer | null;
  opts?: Partial<ClientOptions>;
}) => {
  const {
    startClient,
    isClientIdle,
    isClientPending,
    isClientSuccess,
    isClientError,
    client,
    clientError,
    fetchMessages,
    fetchConversations,
    startStreamingAllMessages,
    stopStreamingAllMessages,
    listenToStreamingAllMessages,
  } = useXmtp({ wallet, opts });

  /* **************************************************************************
   *
   * Messages
   *
   * *************************************************************************/

  const fetchMostRecentMessage = useMemo(() => {
    if (fetchMessages === null) {
      return null;
    } else {
      return async (conversation: Conversation): Promise<Message | null> => {
        const messages = await fetchMessages({
          conversation,
          opts: {
            limit: 1,
            direction: SortDirection.SORT_DIRECTION_DESCENDING,
          },
        });
        if (messages.length === 0) {
          return null;
        } else {
          return messages[0];
        }
      };
    }
  }, [fetchMessages]);

  /* **************************************************************************
   *
   * Previews
   *
   * *************************************************************************/

  const [previews, setPreviews] = useState<AsyncState<Preview[]>>({
    id: "idle",
  });

  const isPreviewsIdle = previews.id === "idle";
  const isPreviewsPending = previews.id === "pending";
  const isPreviewsError = previews.id === "error";
  const isPreviewsSuccess = previews.id === "success";

  const fetchPreview = useMemo(() => {
    if (fetchMostRecentMessage === null) {
      return null;
    } else {
      return async (conversation: Conversation): Promise<Preview | null> => {
        const mostRecentMessage = await fetchMostRecentMessage(conversation);
        if (mostRecentMessage === null) {
          return null;
        } else {
          return {
            ...conversation,
            preview: mostRecentMessage,
          };
        }
      };
    }
  }, [fetchMostRecentMessage]);

  useEffect(() => {
    if (
      !isPreviewsIdle ||
      fetchConversations === null ||
      fetchPreview === null
    ) {
      return;
    } else {
      (async () => {
        try {
          setPreviews((prev) => {
            if (prev.id !== "idle") {
              return prev;
            } else {
              return { id: "pending" };
            }
          });
          const conversations = await fetchConversations();
          const maybeNullPreviews = await Promise.all(
            conversations.map((conversation) => {
              return fetchPreview(conversation);
            })
          );
          const previews = maybeNullPreviews.filter(
            (preview): preview is Preview => preview !== null
          );
          setPreviews((prev) => {
            if (prev.id !== "pending") {
              return prev;
            } else {
              return {
                id: "success",
                data: insertOrUpdatePreviews(prev.data || [], previews),
              };
            }
          });
        } catch (error) {
          setPreviews({ id: "error", error });
        }
      })();
    }
  }, [previews.id, fetchConversations, fetchPreview]);

  /* **************************************************************************
   *
   * Streaming Messages
   *
   * *************************************************************************/

  const [streaming, setStreaming] = useState<AsyncState<boolean>>({
    id: "idle",
  });

  const isStreamingIdle = streaming.id === "idle";
  const isStreamingPending = streaming.id === "pending";
  const isStreamingError = streaming.id === "error";

  useEffect(() => {
    if (
      !isStreamingIdle ||
      startStreamingAllMessages === null ||
      stopStreamingAllMessages === null ||
      listenToStreamingAllMessages === null
    ) {
      return;
    } else {
      (async () => {
        try {
          setStreaming((prev) => {
            if (prev.id !== "idle") {
              return prev;
            } else {
              return { id: "pending" };
            }
          });
          await startStreamingAllMessages();
          await listenToStreamingAllMessages((message: Message) => {
            const preview: Preview = {
              ...message.conversation,
              preview: message,
            };
            setPreviews((prev) => {
              if (prev.id !== "success") {
                return prev;
              } else {
                return {
                  ...prev,
                  data: insertOrUpdatePreviews(prev.data || [], preview),
                };
              }
            });
          });

          return () => {
            stopStreamingAllMessages();
          };
        } catch (error) {
          setStreaming({ id: "error", error });
        }
      })();
    }
  }, [
    streaming.id,
    startStreamingAllMessages,
    stopStreamingAllMessages,
    listenToStreamingAllMessages,
  ]);

  const sortedPreviews = useMemo(() => {
    if (previews.data === undefined) {
      return null;
    } else {
      return sortByMostRecentPreview(previews.data);
    }
  }, [previews.data]);

  return {
    startClient,
    isClientIdle,
    isClientPending,
    isClientSuccess,
    isClientError,
    client,
    clientError,
    isStreamingIdle,
    isStreamingPending,
    isStreamingError,
    isStreaming: streaming.data,
    streamingError: streaming.error,
    isPreviewsIdle,
    isPreviewsPending,
    isPreviewsError,
    isPreviewsSuccess,
    previews: sortedPreviews,
    previewsError: previews.error,
  };
};

type AsyncStateArray<T> = Array<
  | {
      id: "idle";
      uuid: string;
      data?: undefined;
      error?: undefined;
    }
  | {
      id: "pending";
      uuid: string;
      data?: undefined;
      error?: undefined;
    }
  | {
      id: "success";
      uuid: string;
      data: T;
      error?: undefined;
    }
  | {
      id: "fetching";
      uuid: string;
      data: T;
      error?: undefined;
    }
  | {
      id: "error";
      uuid: string;
      error: unknown;
      data?: undefined;
    }
>;

type AsyncState<T> =
  | {
      id: "idle";
      data?: undefined;
      error?: undefined;
    }
  | {
      id: "pending";
      data?: undefined;
      error?: undefined;
    }
  | {
      id: "success";
      data: T;
      error?: undefined;
    }
  | {
      id: "fetching";
      data: T;
      error?: undefined;
    }
  | {
      id: "error";
      error: unknown;
      data?: undefined;
    };
