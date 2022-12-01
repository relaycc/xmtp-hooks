import { isEthAddress } from './eth';

const DM_TOPIC_PREFIX = '/xmtp/0/dm-';
type DmTopicPrefix = typeof DM_TOPIC_PREFIX;
const DM_TOPIC_SUFFIX = '/proto';
type DmTopicSuffix = typeof DM_TOPIC_SUFFIX;
export type DmTopic = `${DmTopicPrefix}${string}${DmTopicSuffix}`;

export const isDmTopic = (topic: string): boolean => {
  const prefix = topic.slice(0, 11);
  const address1 = topic.slice(11, 53);
  const dash = topic.slice(53, 54);
  const address2 = topic.slice(54, 96);
  const suffix = topic.slice(96, 102);

  if (prefix !== '/xmtp/0/dm-') {
    return false;
  }
  if (!isEthAddress(address1)) {
    return false;
  }
  if (dash !== '-') {
    return false;
  }
  if (!isEthAddress(address2)) {
    return false;
  }
  if (suffix !== '/proto') {
    return false;
  }
  if (topic.length !== 102) {
    return false;
  }
  return true;
};
