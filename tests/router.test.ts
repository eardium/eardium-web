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

  // The legal pages must stay reachable: § 5 DDG expects the provider
  // disclosure to be directly accessible from the site, and the waitlist form
  // links to the privacy notice at the point of consent.
  it('routes the legal pages', () => {
    expect(parseHash('#/impressum')).toEqual({ name: 'impressum' });
    expect(parseHash('#/privacy')).toEqual({ name: 'privacy' });
    expect(parseHash('#/impressum/')).toEqual({ name: 'impressum' });
    expect(parseHash('#/privacy/')).toEqual({ name: 'privacy' });
  });
});
