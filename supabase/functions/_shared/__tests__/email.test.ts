import { sendConfirmationEmail } from '../email';

type MockEnv = Record<string, string | undefined>;

describe('waitlist email dispatch', () => {
  const originalDeno = (globalThis as { Deno?: unknown }).Deno;
  const originalFetch = globalThis.fetch;
  let env: MockEnv;

  beforeEach(() => {
    env = {};
    (globalThis as { Deno?: unknown }).Deno = {
      env: { get: (name: string) => env[name] },
    };
  });

  afterEach(() => {
    (globalThis as { Deno?: unknown }).Deno = originalDeno;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('leaves dispatch disabled explicitly when no provider is configured', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(
      sendConfirmationEmail({
        to: 'person@example.com',
        confirmUrl: 'https://example.com/confirm?token=secret',
      }),
    ).resolves.toBe('not_configured');

    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).not.toContain('person@example.com');
    expect(log.mock.calls[0][0]).not.toContain('secret');
  });

  it('sends the double-opt-in message through Cloudflare REST', async () => {
    env = {
      EMAIL_PROVIDER: 'cloudflare',
      CLOUDFLARE_ACCOUNT_ID: 'account-id',
      CLOUDFLARE_EMAIL_API_TOKEN: 'api-token',
      EMAIL_FROM_ADDRESS: 'notify@eardium.com',
      EMAIL_FROM_NAME: 'Eardium',
      EMAIL_REPLY_TO_ADDRESS: 'hello@eardium.com',
    };
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        success: true,
        result: {
          delivered: ['person@example.com'],
          queued: [],
          permanent_bounces: [],
        },
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      sendConfirmationEmail({
        to: 'person@example.com',
        confirmUrl: 'https://example.com/confirm?token=a&b',
      }),
    ).resolves.toBe('sent');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://api.cloudflare.com/client/v4/accounts/account-id/email/sending/send',
    );
    expect(init.headers.Authorization).toBe('Bearer api-token');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      to: 'person@example.com',
      from: { address: 'notify@eardium.com', name: 'Eardium' },
      reply_to: 'hello@eardium.com',
      subject: 'Confirm your Eardium notification',
    });
    expect(body.html).toContain('token=a&amp;b');
    // Withdrawal must be as easy as consent (Art. 7(3) GDPR), and the From
    // address cannot receive: every message has to name a working mailbox.
    expect(body.headers['List-Unsubscribe']).toBe(
      '<mailto:hello@eardium.com?subject=Unsubscribe>',
    );
    expect(body.text).toContain('emailing hello@eardium.com');
    expect(body.html).toContain('emailing hello@eardium.com');
  });

  it('falls back to the privacy contact when no reply-to is configured', async () => {
    env.EMAIL_PROVIDER = 'cloudflare';
    env.CLOUDFLARE_ACCOUNT_ID = 'account-id';
    env.CLOUDFLARE_EMAIL_API_TOKEN = 'api-token';
    env.EMAIL_FROM_ADDRESS = 'notify@eardium.com';
    env.PRIVACY_CONTACT_ADDRESS = 'privacy@example.org';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        result: { delivered: ['person@example.com'], queued: [], permanent_bounces: [] },
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await sendConfirmationEmail({ to: 'person@example.com', confirmUrl: 'https://x/c' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.reply_to).toBe('privacy@example.org');
    expect(body.headers['List-Unsubscribe']).toBe(
      '<mailto:privacy@example.org?subject=Unsubscribe>',
    );
  });

  it('advertises no reply path rather than one that would bounce', async () => {
    env.EMAIL_PROVIDER = 'cloudflare';
    env.CLOUDFLARE_ACCOUNT_ID = 'account-id';
    env.CLOUDFLARE_EMAIL_API_TOKEN = 'api-token';
    env.EMAIL_FROM_ADDRESS = 'notify@eardium.com';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        result: { delivered: ['person@example.com'], queued: [], permanent_bounces: [] },
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await sendConfirmationEmail({ to: 'person@example.com', confirmUrl: 'https://x/c' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.reply_to).toBeUndefined();
    expect(body.headers).toBeUndefined();
    expect(body.text).not.toContain('emailing');
  });

  it('fails closed for an unsupported provider', async () => {
    env.EMAIL_PROVIDER = 'typo';

    await expect(
      sendConfirmationEmail({
        to: 'person@example.com',
        confirmUrl: 'https://example.com/confirm',
      }),
    ).rejects.toThrow('Unsupported EMAIL_PROVIDER');
  });
});
