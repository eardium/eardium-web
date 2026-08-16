import { parseHash } from '../src/router';

describe('hash routes', () => {
  it('keeps the subscribe token client-side', () => {
    expect(parseHash('#/subscribe/private_token_1234567890')).toEqual({
      name: 'subscribe',
      token: 'private_token_1234567890',
    });
  });
});
