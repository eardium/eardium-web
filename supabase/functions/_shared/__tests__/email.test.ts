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
