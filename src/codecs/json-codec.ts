import { ContentCodec, ContentTypeId, EncodedContent } from '@relaycc/xmtp-js';

export const JSON_ID = new ContentTypeId({
  authorityId: 'relay.cc',
  typeId: 'JSON',
  versionMajor: 4,
  versionMinor: 1,
});

export class JSONCodec implements ContentCodec<unknown> {
  get contentType(): ContentTypeId {
    return JSON_ID;
  }

  public encode(content: unknown): EncodedContent {
    return {
      type: JSON_ID,
      parameters: {},
      fallback: `This client does not support the content type ${this.contentType.toString()}. See https://xmtp.org/docs/dev-concepts/content-types for more details.`,
      content: new TextEncoder().encode(JSON.stringify(content)),
    };
  }

  public decode(content: EncodedContent): unknown {
    return JSON.parse(new TextDecoder().decode(content.content));
  }
}
