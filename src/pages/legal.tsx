/**
 * Impressum and privacy notice, served by the web app itself.
 *
 * SOURCE OF TRUTH: the masters in the private `administrative` repository at
 * `eardium/site/legal/impressum.md` and `eardium/site/legal/privacy.md`. This
 * file is a published copy — when a master changes, change it here too, and
 * vice versa. The `eardium-legal` site carries a third copy for the iOS app.
 *
 * The masters contain internal `[LAWYER:]` review notes in HTML comments.
 * Those are deliberately NOT reproduced here: this is the public text.
 *
 * The privacy notice covers both Eardium surfaces, because a reader of either
 * one may hold an account in the other and the processor list is shared.
 */

export function ImpressumPage() {
  return (
    <section className="page legal-page">
      <a className="back-link" href="#/">← Catalog</a>
      <p className="eyebrow">Angaben gemäß § 5 DDG</p>
      <h1>Impressum</h1>

      <h2>Anbieter</h2>
      <p>
        Maksim Palevich<br />
        Prenzlauer Promenade 183<br />
        13189 Berlin<br />
        Deutschland
      </p>
      <p>Einzelunternehmen, Geschäftsbezeichnung „Eardium“</p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href="mailto:m@geldchen.com">m@geldchen.com</a><br />
        Telefon: +49 15678 848233
      </p>

      <h2>Umsatzsteuer-Identifikationsnummer</h2>
      <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: DE463487124</p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        Maksim Palevich<br />
        Prenzlauer Promenade 183<br />
        13189 Berlin
      </p>

      <h2>Haftungsausschluss</h2>
      <p>
        Die Inhalte von Eardium (Audioaufnahmen, Skripte) — in der iOS-App wie auf dieser
        Website — dienen ausschließlich der allgemeinen mentalen Vorbereitung auf
        Wettkampf-, Auftritts- und Prüfungssituationen. Sie stellen keine medizinische,
        psychologische oder therapeutische Beratung dar und ersetzen keine individuelle
        Beratung durch eine qualifizierte Fachperson. Sie sind insbesondere nicht dazu
        bestimmt, körperliche Warnsignale zu deuten oder zu überspielen; bei Schmerzen oder
        ungewöhnlichen Symptomen ist ärztlicher Rat einzuholen und einem Behandlungs- oder
        Rehabilitationsplan zu folgen.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die in der App und auf dieser Website veröffentlichten Inhalte unterliegen dem
        deutschen Urheberrecht. Vervielfältigung, Bearbeitung oder Verbreitung außerhalb der
        Grenzen des Urheberrechts bedürfen der vorherigen schriftlichen Zustimmung des
        Anbieters.
      </p>

      <p className="legal-page__stand">Stand: 23. August 2026</p>
    </section>
  );
}

export function PrivacyPage() {
  return (
    <section className="page legal-page">
      <a className="back-link" href="#/">← Catalog</a>
      <p className="eyebrow">Also serves as the Datenschutzerklärung under GDPR Art. 13</p>
      <h1>Privacy</h1>
      <p className="page__intro">Last updated: August 2026</p>

      <h2>1. Who is responsible for your data (Controller)</h2>
      <p>
        Eardium is operated by:<br />
        Maksim Palevich, Einzelunternehmen, trading as „Eardium“<br />
        Prenzlauer Promenade 183, 13189 Berlin, Germany<br />
        Email: <a href="mailto:m@geldchen.com">m@geldchen.com</a> · Phone: +49 15678 848233
      </p>

      <h2>2. The two Eardium products</h2>
      <p>
        Eardium exists as an <strong>iOS app</strong> and as <strong>Eardium Web</strong>, this
        website, where you can browse the session catalog, listen in the browser, group sessions
        into folders, and subscribe to each folder as a private podcast feed. They use different
        accounts and store different things. Using one does not create an account in the other.
      </p>

      <h3>2a. Eardium Web (this site)</h3>
      <p>
        <strong>No account is required to browse or listen.</strong> The catalog and the player
        work without any account.
      </p>
      <p>
        <strong>Number-only accounts.</strong> If you create an account to keep folders, we
        generate a random 16-digit number and show it to you once. It is the only credential —
        there is no email address, password, or profile. We do not store the number itself: we
        store a keyed HMAC-SHA-256 lookup hash of it, and the key is held separately from the
        database. This means we cannot recover or resend your number, and if you lose it the
        account cannot be restored. Legal basis: performance of a contract (Art. 6(1)(b) GDPR).
      </p>
      <p>
        <strong>Folders and feeds.</strong> For each folder we store the name you chose, which
        catalog sessions you added, when you added them, and a random feed token. The feed token
        is a capability: anyone holding the feed URL can read that folder’s name and its session
        list, so treat it like a password and give folders neutral names. You can rotate a
        folder’s token at any time, which immediately breaks the old URL. Legal basis:
        performance of a contract (Art. 6(1)(b) GDPR).
      </p>
      <p>
        <strong>Feed poll timestamps.</strong> When your podcast app fetches a folder’s feed we
        update two timestamps on that folder — the first and the most recent fetch — so we can
        tell whether the product is actually used over time. We store no IP address, user agent,
        or event history for this. Legal basis: legitimate interest in understanding whether the
        service works (Art. 6(1)(f) GDPR).
      </p>
      <p>
        <strong>Your feed URL reaches your podcast app’s provider.</strong> If you subscribe in
        Apple Podcasts, Overcast, Pocket Casts or similar, that provider receives the feed URL
        and — for apps that poll from their own servers rather than your phone — stores it in
        order to check for new episodes. We have no control over that copy. Rotating the token
        stops it from working.
      </p>
      <p>
        <strong>Waitlist (optional and separate).</strong> If you ask to be told when session
        customisation becomes available, we store your email address and a record of your
        consent. Confirmation is double opt-in: we send a single-use link that expires after 24
        hours, and nothing further until you click it. The address is held in a separate table
        with no link to any account, folder, feed token, or listening selection, and is used for
        that one notification and nothing else — it is not a newsletter. Legal basis: consent
        (Art. 6(1)(a) GDPR); you can withdraw it at any time by emailing{' '}
        <a href="mailto:m@geldchen.com">m@geldchen.com</a>.
      </p>
      <p>
        The consent record consists of when you asked, when we sent the confirmation, when you
        confirmed, which version of this notice applied, <strong>and the IP address your request
        and your confirmation click came from</strong>. The two IP addresses are kept because a
        timestamp and IP for each step is the standard way to demonstrate that a double opt-in
        genuinely happened; the legal basis for retaining them is our legitimate interest in
        being able to prove that consent (Art. 6(1)(f) GDPR). If you never click the confirmation
        link, the whole record — email address and IP addresses included — is deleted about 30
        days after the link expires.
      </p>
      <p>
        <strong>Rate limiting.</strong> To stop the public forms being scripted to create
        accounts in bulk or to send confirmation emails to addresses that never asked for them,
        we briefly count requests per IP address. These counters hold an IP for at most about two
        hours and are then deleted; they are not linked to your account, folders, or waitlist
        entry. Legal basis: legitimate interest in protecting the service and third parties from
        abuse (Art. 6(1)(f) GDPR).
      </p>
      <p>
        <strong>No cookies or tracking.</strong> This site sets no analytics, advertising, or
        tracking cookies and embeds no third-party analytics. Your account number is kept in your
        browser’s local storage so the site remembers you between visits; logging out on a device
        removes it.
      </p>

      <h3>2b. Eardium iOS app</h3>
      <p>
        <strong>Account data.</strong> To create an account you provide an email address and
        password, or sign in with Apple (which shares your name and, optionally, a private relay
        email address). You can also use the app without an account in Guest mode, in which case
        we hold only an anonymous, randomly generated identifier with no personal information
        attached. Legal basis: performance of a contract (Art. 6(1)(b) GDPR).
      </p>
      <p>
        <strong>Usage data.</strong> We store which sessions you’ve played, how many times, when
        you last played them, and which ones you’ve marked as favorites, so your library and
        listening history work across app launches. This is tied to your account (or your
        anonymous Guest identifier) and never shared or sold. Legal basis: performance of a
        contract / legitimate interest (Art. 6(1)(b)/(f) GDPR).
      </p>
      <p>
        <strong>Purchase status.</strong> Eardium’s lifetime catalog unlock is billed and
        processed entirely by Apple through the App Store. We never see or store your payment
        card details, billing address, or full purchase history — our systems only receive a
        signal of whether the unlock is owned. Legal basis: performance of a contract
        (Art. 6(1)(b) GDPR).
      </p>
      <p>
        <strong>Microphone access (not yet in use).</strong> The app requests microphone
        permission on iOS in preparation for an upcoming voice-cloning feature. That feature is
        not active — no microphone audio is currently recorded, stored, or transmitted. We will
        update this notice and ask for your confirmation before it becomes active for you.
      </p>

      <h2>3. Server logs</h2>
      <p>
        Our hosting and backend providers keep short-term technical logs that can include IP
        addresses and requested URLs. For this site that means a private feed URL can appear
        temporarily in a provider’s request logs, under that provider’s own retention period.
        Legal basis: legitimate interest in operating and securing the service
        (Art. 6(1)(f) GDPR).
      </p>
      <p>
        Separately from those provider logs, the only IP addresses <strong>we</strong>{' '}
        deliberately record are the two named above: the waitlist consent evidence, and the
        short-lived rate-limit counters. In particular the folder and feed records — including
        the poll timestamps we use to see whether the product is used — hold no IP address, user
        agent, or event history at all.
      </p>

      <h2>4. Who we share data with</h2>
      <p>
        We use a small number of service providers (processors). None of them are permitted to
        use your data for their own purposes.
      </p>
      <ul className="legal-page__list">
        <li>
          <strong>Supabase, Inc.</strong> (USA) — database and backend for both products, and
          file storage for the app. This website uses a separate Supabase project in the EU
          (Frankfurt) from the one behind the iOS app.
        </li>
        <li>
          <strong>GitHub, Inc.</strong> (USA) — hosting and delivery of this site via GitHub
          Pages.
        </li>
        <li>
          <strong>Cloudflare, Inc.</strong> (USA) — sending the waitlist confirmation and
          notification emails. Cloudflare necessarily processes sender, recipient, subject,
          message id, and delivery errors, and retains those delivery analytics for 31 days.
          Message preview is disabled.
        </li>
        <li>
          <strong>Apple Inc.</strong> — In-App Purchase billing, Sign in with Apple, and app
          distribution (iOS app only).
        </li>
        <li>
          <strong>ElevenLabs, Inc.</strong> (USA) — text-to-speech synthesis used to produce the
          narrated audio in the content catalog.
        </li>
      </ul>
      <p>
        Where a provider is based outside the EU/EEA, the transfer is covered by that provider’s
        certification under the EU–US Data Privacy Framework and/or Standard Contractual Clauses
        under Art. 46 GDPR.
      </p>
      <p>
        We do not use third-party advertising or analytics SDKs, and we do not sell your personal
        information.
      </p>

      <h2>5. How long we keep your data</h2>
      <p>
        <strong>This website.</strong> Account, folder, and feed data are kept until you delete
        the account. Deleting it from the account page removes the account, every folder, and
        every folder’s contents, which permanently breaks all of your feed URLs. Waitlist
        addresses are kept until the notification has been sent or you withdraw consent.
      </p>
      <p>
        <strong>Eardium iOS app.</strong> Account and usage data are kept for as long as your
        account exists; you can delete it from Settings → Delete Account. Some records may be
        retained briefly where required by law (e.g. billing records via Apple).
      </p>

      <h2>6. Children’s privacy</h2>
      <p>
        Eardium is not directed at children, and we do not knowingly collect personal data from
        anyone under 16. If you believe a child has provided us with personal data, contact us
        and we will delete it.
      </p>

      <h2>7. Your rights</h2>
      <p>
        Under the GDPR you have the right to access (Art. 15), rectification (Art. 16), erasure
        (Art. 17), restriction (Art. 18), portability (Art. 20), and objection (Art. 21). Where
        processing is based on consent you may withdraw it at any time without affecting the
        lawfulness of processing before withdrawal (Art. 7(3)). To exercise any of these, email{' '}
        <a href="mailto:m@geldchen.com">m@geldchen.com</a>.
      </p>
      <p>
        Please note that for number-only accounts we hold no information that identifies you, so
        we cannot connect a request to an account unless you provide the account number itself.
      </p>

      <h2>8. Right to complain</h2>
      <p>
        Berliner Beauftragte für Datenschutz und Informationsfreiheit (BlnBDI)<br />
        Alt-Moabit 59–61, 10555 Berlin<br />
        Telefon: +49 30 13889-0 ·{' '}
        <a href="mailto:mailbox@datenschutz-berlin.de">mailbox@datenschutz-berlin.de</a><br />
        <a href="https://www.datenschutz-berlin.de" rel="noreferrer noopener" target="_blank">
          datenschutz-berlin.de
        </a>
      </p>

      <h2>9. Changes to this notice</h2>
      <p>
        If we change what data we collect or how we use it, we’ll update this page and revise the
        date above. For material changes we’ll say so in the product.
      </p>

      <p className="legal-page__stand">Stand: 23. August 2026</p>
    </section>
  );
}
