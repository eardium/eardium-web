import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ApiError,
  createAccount,
  deleteAccount,
  folderAction,
  joinWaitlist,
  listFolders,
  loginAccount,
} from './api';
import {
  clearAccountNumber,
  formatAccountNumber,
  isValidAccountNumber,
  loadAccountNumber,
  normalizeAccountNumber,
  saveAccountNumber,
} from './account';
import { KaraokePlayer } from './components/KaraokePlayer';
import { SubscribePanel } from './components/SubscribePanel';
import { parseHash } from './router';
import { ImpressumPage, PrivacyPage } from './pages/legal';
import { CATEGORY_CONTENT } from './shared/content/categories';
import {
  getAllCatalogEntries,
  getCatalogByCategory,
  getCatalogEntry,
  type CatalogEntry,
} from './shared/content/catalog';
import { getComingSoon } from './shared/content/coming-soon';
import { VIBE_DEFINITIONS } from './shared/content/vibes';
import type { Category } from './shared/types';
import type { Folder, Route } from './types';

const CATEGORY_ORDER: Category[] = [
  'running',
  'gym',
  'tennis',
  'public_speaking',
  'exams',
  'interviews',
  'foundations',
];

const SUGGESTED_FOLDERS = [
  { name: 'Race Week', detail: 'Start line, pace, wall, finish' },
  { name: 'Interview Crunch', detail: 'Walk-in, hardest question, reset' },
  { name: 'Daily Foundations', detail: 'Short, repeatable rehearsal practice' },
];

type FoldersStatus = 'idle' | 'loading' | 'ready' | 'error';

function minutes(entry: CatalogEntry): string {
  return `${Math.round(entry.duration_seconds / 60)} min`;
}

function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const update = () => {
      setRoute(parseHash(window.location.hash));
      // A hash change does not reset the scroll offset, so following a link
      // from far down one page opened the next one part-scrolled. Most visible
      // on the long legal pages, but it affects every route.
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}

/* ── Shell ─────────────────────────────────────────────────────── */

function PageHeader({ route, accountNumber }: { route: Route; accountNumber: string | null }) {
  const onCatalog = route.name === 'home' || route.name === 'category' || route.name === 'session';
  const onFeeds = route.name === 'folders' || route.name === 'folder' || route.name === 'account';
  return (
    <header className="top">
      <div className="top__inner">
        <a className="brand" href="#/" aria-label="Eardium home">
          <span className="brand__mark" aria-hidden="true" />
          <span>Eardium</span>
        </a>
        <nav aria-label="Primary navigation">
          <a className={onCatalog ? 'is-active' : undefined} href="#/">Catalog</a>
          <a className={onFeeds ? 'is-active' : undefined} href="#/folders">Feeds</a>
        </nav>
        <a className="top__account" href="#/account" aria-label="Account">
          {accountNumber ? `Account ···· ${accountNumber.slice(-4)}` : 'No account'}
        </a>
      </div>
    </header>
  );
}

function PageFooter() {
  return (
    <footer>
      <div className="footer__inner">
        <span>Eardium · rehearsal for the moment ahead</span>
        <span className="footer__legal">
          <a href="#/impressum">Impressum</a>
          <a href="#/privacy">Privacy</a>
        </span>
      </div>
    </footer>
  );
}

/* ── Catalog (home + category filter) ──────────────────────────── */

function SessionRow({ entry }: { entry: CatalogEntry }) {
  return (
    <li>
      <a className="row" href={`#/s/${entry.id}`}>
        <span className="row__title">{entry.title}</span>
        <span className="row__scenario">{entry.scenario}</span>
        <span className="row__meta">{VIBE_DEFINITIONS[entry.vibe].name}</span>
        <span className="row__dur">{minutes(entry)}</span>
      </a>
    </li>
  );
}

function HomePage({ category, accountNumber }: { category?: Category; accountNumber: string | null }) {
  const all = getAllCatalogEntries();
  const groups = CATEGORY_ORDER
    .map((id) => ({
      id,
      label: CATEGORY_CONTENT[id].label,
      entries: getCatalogByCategory(id),
      coming: getComingSoon(id),
    }))
    .filter((group) => group.entries.length || group.coming.length);
  const visible = category ? groups.filter((group) => group.id === category) : groups;

  return (
    <>
      <section className="lede">
        <div>
          <h1>Rehearse the moment before it arrives.</h1>
          <p className="lede__text">
            Guided mental-rehearsal audio with the words in view. Listen here, or place sessions in a
            private folder that your podcast app follows.
          </p>
        </div>
        <dl className="facts">
          <div>
            <dt>Catalog</dt>
            <dd>{all.length} sessions across {groups.filter((g) => g.entries.length).length} situations</dd>
          </div>
          <div>
            <dt>Account</dt>
            <dd>A random 16-digit number. No email.</dd>
          </div>
          <div>
            <dt>Delivery</dt>
            <dd>One private RSS link per folder.</dd>
          </div>
        </dl>
      </section>

      <section id="catalog" aria-label="Catalog">
        <nav className="filter" aria-label="Filter by situation">
          <a className={category ? undefined : 'is-active'} href="#/">
            All<span>{all.length}</span>
          </a>
          {groups.map((group) => (
            <a
              className={group.id === category ? 'is-active' : undefined}
              href={`#/c/${group.id}`}
              key={group.id}
            >
              {group.label}<span>{group.entries.length}</span>
            </a>
          ))}
        </nav>

        {visible.map((group) => (
          <div className="group" key={group.id}>
            <div className="group__head">
              <h2>{group.label}</h2>
              <span>
                {group.entries.length} {group.entries.length === 1 ? 'session' : 'sessions'}
                {group.coming.length ? ` · ${group.coming.length} coming` : ''}
              </span>
            </div>
            <ol className="rows">
              {group.entries.map((entry) => <SessionRow entry={entry} key={entry.id} />)}
              {group.coming.length > 0 && (
                <li className="row row--soon">
                  <span className="row__meta">Coming soon</span>
                  <span>{group.coming.map((entry) => entry.title).join(' · ')}</span>
                </li>
              )}
            </ol>
          </div>
        ))}
      </section>

      <section className="strip">
        <div>
          <h2>Folders become private podcast feeds.</h2>
          <p>
            Add sessions to a folder; each folder has one private RSS link. Restore your folders on
            any device with the 16-digit number. Nothing enters a feed unless you add it.
          </p>
        </div>
        <a className="button" href="#/folders">{accountNumber ? 'Open your feeds' : 'Create a feed'}</a>
      </section>
    </>
  );
}

/* ── Session ───────────────────────────────────────────────────── */

interface SessionPageProps {
  id: string;
  accountNumber: string | null;
  folders: Folder[];
  refreshFolders: () => Promise<void>;
}

function SessionPage({ id, accountNumber, folders, refreshFolders }: SessionPageProps) {
  const entry = getCatalogEntry(id);
  const [folderId, setFolderId] = useState(folders[0]?.id || '');
  const [status, setStatus] = useState('');
  useEffect(() => {
    if (!folderId && folders[0]) setFolderId(folders[0].id);
  }, [folderId, folders]);
  if (!entry) return <NotFoundPage />;
  const category = CATEGORY_CONTENT[entry.category];

  async function addToFolder(): Promise<void> {
    if (!accountNumber || !folderId) return;
    try {
      await folderAction(accountNumber, 'add_item', { folder_id: folderId, catalog_id: entry!.id });
      await refreshFolders();
      setStatus('Added. Your podcast app will see it on its next feed refresh.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not add this session.');
    }
  }

  return (
    <section className="page">
      <div className="session-head">
        <div>
          <p className="crumbs">
            <a href="#/">Catalog</a><span aria-hidden="true">/</span>
            <a href={`#/c/${entry.category}`}>{category.label}</a>
          </p>
          <p className="meta">{VIBE_DEFINITIONS[entry.vibe].name} · {minutes(entry)}</p>
          <h1>{entry.title}</h1>
          <p className="page__intro">{entry.scenario}</p>
        </div>
        <div className="folder-add">
          {accountNumber ? (
            <>
              <label htmlFor="folder-select">Add to a private feed</label>
              <div className="folder-add__row">
                <select id="folder-select" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
                  {folders.map((folder) => <option value={folder.id} key={folder.id}>{folder.name}</option>)}
                </select>
                <button className="button" type="button" disabled={!folderId} onClick={addToFolder}>Add</button>
              </div>
            </>
          ) : (
            <a className="button button--secondary" href="#/account">Create a private feed</a>
          )}
          {status && <p className="form-status">{status}</p>}
        </div>
      </div>
      <KaraokePlayer entry={entry} key={entry.id} />
    </section>
  );
}

/* ── Feeds (folders + account on one page) ─────────────────────── */

interface AccountBlockProps {
  accountNumber: string | null;
  setAccountNumber: (value: string | null) => void;
  setFolders: (folders: Folder[]) => void;
}

function AccountBlock({ accountNumber, setAccountNumber, setFolders }: AccountBlockProps) {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('');
  const [createdNumber, setCreatedNumber] = useState<string | null>(null);

  async function create(): Promise<void> {
    try {
      const result = await createAccount();
      saveAccountNumber(result.account_number);
      setAccountNumber(result.account_number);
      setFolders(result.folders);
      setCreatedNumber(result.account_number);
      setStatus('Account created. Save this number somewhere safe.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not create an account.');
    }
  }

  async function login(event: FormEvent): Promise<void> {
    event.preventDefault();
    const normalized = normalizeAccountNumber(input);
    if (!isValidAccountNumber(normalized)) return setStatus('Enter all 16 digits.');
    try {
      const result = await loginAccount(normalized);
      saveAccountNumber(normalized);
      setAccountNumber(normalized);
      setFolders(result.folders);
      setStatus('Account restored.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not restore this account.');
    }
  }

  async function copyNumber(): Promise<void> {
    if (!accountNumber) return;
    try {
      await navigator.clipboard.writeText(accountNumber);
      setStatus('Account number copied.');
    } catch {
      setStatus('Copying failed — select and copy the number above manually.');
    }
  }

  function logout(): void {
    clearAccountNumber();
    setAccountNumber(null);
    setFolders([]);
    setCreatedNumber(null);
    setStatus('');
  }

  return (
    <div className="block" id="account">
      <div className="block__head">
        <h2>Account</h2>
        <p>The number is the credential. We store only a keyed lookup hash, never the number itself.</p>
      </div>
      {accountNumber ? (
        <div className="credential">
          <div>
            <span>Your account number</span>
            <strong>{formatAccountNumber(accountNumber)}</strong>
          </div>
          <div className="button-row">
            <button className="button button--secondary" type="button" onClick={copyNumber}>Copy</button>
            <button className="text-button" type="button" onClick={logout}>Log out on this device</button>
          </div>
        </div>
      ) : (
        <div className="account-grid">
          <div className="account-card">
            <h3>New here</h3>
            <p>Generate a random number and one empty “My Sessions” folder.</p>
            <button className="button" type="button" onClick={create}>Create account</button>
          </div>
          <form className="account-card" onSubmit={login}>
            <h3>Restore folders</h3>
            <div className="field">
              <label htmlFor="account-number">16-digit account number</label>
              <input
                id="account-number"
                inputMode="numeric"
                autoComplete="off"
                value={formatAccountNumber(input)}
                onChange={(e) => setInput(normalizeAccountNumber(e.target.value))}
                placeholder="0000 0000 0000 0000"
              />
            </div>
            <button className="button button--secondary" type="submit">Restore</button>
          </form>
        </div>
      )}
      {createdNumber && (
        <p className="notice">Shown once, right after creation. Losing this number means losing access to these folders.</p>
      )}
      {status && <p className="form-status">{status}</p>}
    </div>
  );
}

interface FoldersBlockProps {
  accountNumber: string;
  folders: Folder[];
  foldersStatus: FoldersStatus;
  refreshFolders: () => Promise<void>;
}

function FoldersBlock({ accountNumber, folders, foldersStatus, refreshFolders }: FoldersBlockProps) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');

  async function createFolder(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      await folderAction(accountNumber, 'create_folder', { name: name.trim() });
      setName('');
      setStatus('');
      await refreshFolders();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not create the folder.');
    }
  }

  return (
    <div className="block" id="folders">
      <div className="block__head">
        <h2>Folders</h2>
        <p>Only sessions you explicitly add appear in a feed. Names are visible to anyone holding the link.</p>
      </div>
      {foldersStatus === 'loading' || foldersStatus === 'idle' ? (
        <p className="empty-copy">Loading your folders…</p>
      ) : foldersStatus === 'error' ? (
        <p className="empty-copy">Couldn’t load your folders. Check your connection and reload. Your account number is still saved on this device.</p>
      ) : folders.length ? (
        <ul className="rows">
          {folders.map((folder) => (
            <li key={folder.id}>
              <a className="row row--folder" href={`#/folders/${folder.id}`}>
                <span className="row__title">{folder.name}</span>
                <span className="row__meta">{folder.item_count} {folder.item_count === 1 ? 'session' : 'sessions'}</span>
                <span className="row__dur">Open →</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-copy">No folders yet. Create one below.</p>
      )}
      <form className="inline-form" style={{ marginTop: 18 }} onSubmit={createFolder}>
        <div className="field">
          <label htmlFor="folder-name">New folder</label>
          <input id="folder-name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Use a neutral name" />
        </div>
        <button className="button" type="submit">Create</button>
      </form>
      {status && <p className="form-status">{status}</p>}
      <ul className="packs" aria-label="Folder ideas">
        {SUGGESTED_FOLDERS.map((folder) => (
          <li key={folder.name}><strong>{folder.name}</strong> — {folder.detail}</li>
        ))}
      </ul>
    </div>
  );
}

function WaitlistBlock({ last }: { last: boolean }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  async function waitlist(event: FormEvent): Promise<void> {
    event.preventDefault();
    try {
      await joinWaitlist(email);
      setEmail('');
      setStatus('Check your inbox for a confirmation link.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not submit the email.');
    }
  }

  return (
    <div className={last ? 'block block--end' : 'block'}>
      <form className="waitlist" onSubmit={waitlist}>
        <div>
          <p className="eyebrow">Optional and separate</p>
          <h2>Tell me when customisation arrives.</h2>
          <p>
            This email is not connected to your account, folders, or listening selections. One
            confirmation link, then one message when it&rsquo;s ready &mdash; nothing else.{' '}
            <a href="#/privacy">What we store and why</a>.
          </p>
        </div>
        <div>
          <div className="inline-form">
            <div className="field">
              <label htmlFor="waitlist-email">Email</label>
              <input id="waitlist-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <button className="button button--secondary" type="submit">Send confirmation</button>
          </div>
          {status && <p className="form-status">{status}</p>}
        </div>
      </form>
    </div>
  );
}

interface FeedsPageProps extends AccountBlockProps {
  folders: Folder[];
  foldersStatus: FoldersStatus;
  refreshFolders: () => Promise<void>;
}

function FeedsPage({ accountNumber, setAccountNumber, setFolders, folders, foldersStatus, refreshFolders }: FeedsPageProps) {
  const [status, setStatus] = useState('');

  async function removeAccount(): Promise<void> {
    if (!accountNumber || !window.confirm('Delete this account, every folder, and every feed link?')) return;
    try {
      await deleteAccount(accountNumber);
      clearAccountNumber();
      setAccountNumber(null);
      setFolders([]);
      setStatus('Account and feeds deleted.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not delete the account.');
    }
  }

  return (
    <section className="page">
      <div className="page__head">
        <p className="eyebrow">Private RSS</p>
        <h1>{accountNumber ? 'Your feeds' : 'Feeds without an identity.'}</h1>
        <p className="page__intro">
          Each folder is one private podcast feed. A random 16-digit number restores your folders on
          any device. No email is needed for any of it.
        </p>
      </div>
      {accountNumber && (
        <FoldersBlock
          accountNumber={accountNumber}
          folders={folders}
          foldersStatus={foldersStatus}
          refreshFolders={refreshFolders}
        />
      )}
      <AccountBlock accountNumber={accountNumber} setAccountNumber={setAccountNumber} setFolders={setFolders} />
      <WaitlistBlock last={!accountNumber} />
      {accountNumber && (
        <div className="block block--end">
          <button className="text-button text-button--danger" type="button" onClick={removeAccount}>Delete account and all feeds</button>
          {status && <p className="form-status">{status}</p>}
        </div>
      )}
      {!accountNumber && status && <p className="form-status">{status}</p>}
    </section>
  );
}

/* ── Single folder ─────────────────────────────────────────────── */

interface FolderPageProps {
  id: string;
  accountNumber: string | null;
  folders: Folder[];
  foldersStatus: FoldersStatus;
  refreshFolders: () => Promise<void>;
}

function FolderPage({ id, accountNumber, folders, foldersStatus, refreshFolders }: FolderPageProps) {
  const folder = folders.find((candidate) => candidate.id === id);
  const [status, setStatus] = useState('');

  if (!accountNumber) {
    return (
      <section className="page empty">
        <p className="eyebrow">Private folder</p>
        <h1>This folder belongs to an account.</h1>
        <p>Restore your account number to open it.</p>
        <a className="button" href="#/account">Open account</a>
      </section>
    );
  }
  if (!folder) {
    // Folders arrive asynchronously on a fresh page load — only claim the
    // folder is missing once we actually know what the account contains.
    if (foldersStatus === 'loading' || foldersStatus === 'idle') {
      return <section className="page empty"><p className="eyebrow">Private folder</p><h1>Loading your folders…</h1></section>;
    }
    if (foldersStatus === 'error') {
      return (
        <section className="page empty">
          <p className="eyebrow">Private folder</p>
          <h1>Couldn’t load your folders.</h1>
          <p>Check your connection and reload this page. Your account number is still saved on this device.</p>
        </section>
      );
    }
    return <NotFoundPage />;
  }

  async function removeItem(catalogId: string): Promise<void> {
    try {
      await folderAction(accountNumber!, 'remove_item', { folder_id: folder!.id, catalog_id: catalogId });
      await refreshFolders();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not remove the session.');
    }
  }

  async function rotateToken(): Promise<void> {
    if (!window.confirm('Replace this private feed link? Podcast apps using the old link will stop updating.')) return;
    try {
      await folderAction(accountNumber!, 'rotate_token', { folder_id: folder!.id });
      await refreshFolders();
      setStatus('Feed link rotated. Re-subscribe using the new link below.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not rotate the feed link.');
    }
  }

  const items = folder.items ?? [];
  return (
    <section className="page">
      <div className="page__head">
        <p className="crumbs">
          <a href="#/folders">Feeds</a><span aria-hidden="true">/</span><span>{folder.name}</span>
        </p>
        <h1>{folder.name}</h1>
        <p className="page__intro">
          {items.length} {items.length === 1 ? 'session' : 'sessions'}. The name appears in podcast apps
          and is visible to anyone holding the feed link.
        </p>
      </div>
      {items.length ? (
        <ol className="rows">
          {items.map((item) => {
            const entry = getCatalogEntry(item.catalog_id);
            return entry ? (
              <li className="row row--item" key={item.catalog_id}>
                <span>{String(item.position).padStart(2, '0')}</span>
                <div className="row__stack">
                  <a href={`#/s/${entry.id}`}>{entry.title}</a>
                  <small>{entry.scenario} · {minutes(entry)}</small>
                </div>
                <button className="text-button" type="button" onClick={() => removeItem(item.catalog_id)}>Remove</button>
              </li>
            ) : null;
          })}
        </ol>
      ) : (
        <p className="empty-copy">No sessions yet. Open any catalog session and add it here.</p>
      )}
      {status && <p className="form-status">{status}</p>}
      <SubscribePanel token={folder.feed_token} />
      <p style={{ marginTop: 24 }}>
        <button className="text-button text-button--danger" type="button" onClick={rotateToken}>Rotate private feed link</button>
      </p>
    </section>
  );
}

/* ── Handoff + misc ────────────────────────────────────────────── */

function SubscribePage({ token }: { token: string }) {
  return (
    <section className="subscribe-page">
      <a className="brand brand--center" href="#/"><span className="brand__mark" aria-hidden="true" /><span>Eardium</span></a>
      <SubscribePanel token={token} compact />
      <p className="subscribe-page__foot">No account number is read or stored on this handoff page.</p>
    </section>
  );
}

function NotFoundPage() {
  return (
    <section className="page empty">
      <p className="eyebrow">404</p>
      <h1>That page is not here.</h1>
      <p>The link may be old, or the session may have been removed from the catalog.</p>
      <a className="button button--secondary" href="#/">Return to catalog</a>
    </section>
  );
}

/* ── App ───────────────────────────────────────────────────────── */

export function App() {
  const route = useRoute();
  const handoffOnly = route.name === 'subscribe';
  const [accountNumber, setAccountNumber] = useState<string | null>(() =>
    route.name === 'subscribe' ? null : loadAccountNumber(),
  );
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersStatus, setFoldersStatus] = useState<FoldersStatus>('idle');

  // The handoff page never reads the stored number; pick it back up as soon as
  // the user navigates anywhere else, so a session that started on a subscribe
  // link is not stuck logged out (and cannot overwrite the saved credential).
  useEffect(() => {
    if (handoffOnly || accountNumber !== null) return;
    const stored = loadAccountNumber();
    if (stored) setAccountNumber(stored);
  }, [handoffOnly, accountNumber]);

  const refreshFolders = useCallback(async () => {
    if (!accountNumber) return setFolders([]);
    setFolders(await listFolders(accountNumber));
  }, [accountNumber]);

  useEffect(() => {
    if (handoffOnly) return;
    if (!accountNumber) {
      setFoldersStatus('idle');
      return;
    }
    let cancelled = false;
    setFoldersStatus('loading');
    loginAccount(accountNumber)
      .then((result) => {
        if (cancelled) return;
        setFolders(result.folders);
        setFoldersStatus('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        // Only an explicit rejection of the number means the account is gone.
        // A network failure or server error must not destroy the credential —
        // it is shown exactly once and cannot be recovered.
        if (error instanceof ApiError && error.status === 401) {
          clearAccountNumber();
          setAccountNumber(null);
          setFolders([]);
          setFoldersStatus('idle');
        } else {
          setFoldersStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accountNumber, handoffOnly]);

  const page = useMemo(() => {
    const feeds = (
      <FeedsPage
        accountNumber={accountNumber}
        setAccountNumber={setAccountNumber}
        setFolders={setFolders}
        folders={folders}
        foldersStatus={foldersStatus}
        refreshFolders={refreshFolders}
      />
    );
    switch (route.name) {
      case 'home': return <HomePage accountNumber={accountNumber} />;
      case 'category':
        return route.category in CATEGORY_CONTENT
          ? <HomePage category={route.category as Category} accountNumber={accountNumber} />
          : <NotFoundPage />;
      case 'session': return <SessionPage id={route.id} accountNumber={accountNumber} folders={folders} refreshFolders={refreshFolders} />;
      case 'folders': return feeds;
      case 'account': return feeds;
      case 'folder': return <FolderPage id={route.id} accountNumber={accountNumber} folders={folders} foldersStatus={foldersStatus} refreshFolders={refreshFolders} />;
      case 'subscribe': return <SubscribePage token={route.token} />;
      case 'impressum': return <ImpressumPage />;
      case 'privacy': return <PrivacyPage />;
      default: return <NotFoundPage />;
    }
  }, [accountNumber, folders, foldersStatus, refreshFolders, route]);

  return (
    <div className="site-shell">
      {!handoffOnly && <PageHeader route={route} accountNumber={accountNumber} />}
      <main>{page}</main>
      <PageFooter />
    </div>
  );
}
