import { parseHash } from '../src/router';

describe('hash routes', () => {
  it('keeps the subscribe token client-side', () => {
    expect(parseHash('#/subscribe/private_token_1234567890')).toEqual({
      name: 'subscribe',
      token: 'private_token_1234567890',
    });
  });

  it('survives malformed percent-encoding instead of throwing', () => {
    expect(parseHash('#/s/100%')).toEqual({ name: 'session', id: '100%' });
    expect(parseHash('#/c/run%zz')).toEqual({ name: 'category', category: 'run%zz' });
  });
});
