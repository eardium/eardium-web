import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
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
import { getAllCatalogEntries, getCatalogByCategory, getCatalogEntry } from './shared/content/catalog';
import { getComingSoon } from './shared/content/coming-soon';
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

function PageHeader({ accountNumber }: { accountNumber: string | null }) {
  return (
    <header className="site-header">
      <a className="brand" href="#/" aria-label="Eardium home">
        <span className="brand__mark" aria-hidden="true">e</span>
        <span>Eardium</span>
      </a>
      <nav aria-label="Primary navigation">
        <a href="#/">Catalog</a>
        <a href="#/folders">Folders</a>
        <a href="#/account">{accountNumber ? 'Account' : 'Save your feed'}</a>
      </nav>
    </header>
  );
}

function SessionCard({ id }: { id: string }) {
  const entry = getCatalogEntry(id);
  if (!entry) return null;
  const category = CATEGORY_CONTENT[entry.category];
  return (
    <a className="session-card" href={`#/s/${entry.id}`} style={{ '--accent': category.color } as CSSProperties}>
      <span className="session-card__meta">{category.label} · {entry.vibe}</span>
      <strong>{entry.title}</strong>
      <span>{entry.scenario}</span>
      <span className="session-card__duration">{Math.round(entry.duration_seconds / 60)} min</span>
    </a>
  );
}

function HomePage() {
  const featured = getAllCatalogEntries().filter((entry) => entry.is_free).slice(0, 6);
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Mental rehearsal, delivered simply</p>
          <h1>Hear the moment before it arrives.</h1>
          <p className="hero__lead">
            Choose a guided rehearsal, listen with the words in view, then place it in a private
            folder that follows you into your podcast app.
          </p>
          <div className="button-row">
            <a className="button" href="#/c/running">Browse the catalog</a>
            <a className="button button--ghost" href="#/folders">Build a private feed</a>
          </div>
        </div>
        <div className="hero__signal" aria-hidden="true">
          <div className="signal-orb" />
          <p>prepare · hear · arrive</p>
        </div>
      </section>

      <section className="section" id="catalog">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Start with the situation</p>
            <h2>What are you preparing for?</h2>
          </div>
          <span>{getAllCatalogEntries().length} catalog sessions</span>
        </div>
        <div className="category-grid">
          {CATEGORY_ORDER.map((categoryId) => {
            const category = CATEGORY_CONTENT[categoryId];
            const count = getCatalogByCategory(categoryId).length;
            return (
              <a
                className="category-card"
                href={`#/c/${categoryId}`}
                key={categoryId}
                style={{ '--accent': category.color } as CSSProperties}
              >
                <span className="category-card__count">{String(count).padStart(2, '0')}</span>
                <h3>{category.label}</h3>
                <p>{category.quick_picks[0]?.description || 'Build familiarity through guided rehearsal.'}</p>
                <span className="category-card__link">Explore →</span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-heading"><h2>Open a session</h2><span>Listen before saving anything</span></div>
        <div className="session-grid">
          {featured.map((entry) => <SessionCard id={entry.id} key={entry.id} />)}
        </div>
      </section>

      <section className="privacy-strip">
        <p className="eyebrow">Deliberately small account surface</p>
        <h2>No email is required to use the catalog or create folders.</h2>
        <p>
          A random 16-digit number restores your folders. Email is collected only if you separately
          ask to hear when customisation becomes available.
        </p>
      </section>
    </>
  );
}

function CategoryPage({ categoryId }: { categoryId: string }) {
  const category = CATEGORY_CONTENT[categoryId as Category];
  if (!category) return <NotFoundPage />;
  const entries = getCatalogByCategory(category.category);
  const coming = getComingSoon(category.category);
  return (
    <section className="page">
      <a className="back-link" href="#/">← Catalog</a>
      <p className="eyebrow">{category.domain}</p>
      <h1>{category.label}</h1>
      <p className="page__intro">Choose the situation closest to the moment you want to rehearse.</p>
      <div className="session-grid">
        {entries.map((entry) => <SessionCard id={entry.id} key={entry.id} />)}
        {coming.map((entry) => (
          <article className="session-card session-card--soon" key={entry.id}>
            <span className="session-card__meta">Coming soon</span>
            <strong>{entry.title}</strong>
            <span>{entry.teaser}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

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
    <section className="page session-page">
      <a className="back-link" href={`#/c/${entry.category}`}>← {CATEGORY_CONTENT[entry.category].label}</a>
      <div className="session-heading">
        <div>
          <p className="eyebrow">{entry.vibe} · {Math.round(entry.duration_seconds / 60)} minutes</p>
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
            <a className="button" href="#/account">Create a private feed</a>
          )}
          {status && <p className="form-status">{status}</p>}
        </div>
      </div>
      <KaraokePlayer entry={entry} key={entry.id} />
    </section>
  );
}

type FoldersStatus = 'idle' | 'loading' | 'ready' | 'error';

interface FoldersPageProps {
  accountNumber: string | null;
  folders: Folder[];
  refreshFolders: () => Promise<void>;
}

function FoldersPage({ accountNumber, folders, refreshFolders }: FoldersPageProps) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  async function createFolder(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!accountNumber || !name.trim()) return;
    try {
      await folderAction(accountNumber, 'create_folder', { name: name.trim() });
      setName('');
      await refreshFolders();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not create the folder.');
    }
  }
  if (!accountNumber) {
    return (
      <section className="page empty-state">
        <p className="eyebrow">Folders become feeds</p>
        <h1>Your sessions, already where you listen.</h1>
        <p>Create a number-only account. Each folder gets one private RSS link.</p>
        <a className="button" href="#/account">Create an account</a>
      </section>
    );
  }
  return (
    <section className="page">
      <p className="eyebrow">Private RSS</p>
      <h1>Your folders</h1>
      <p className="page__intro">
        Only sessions you explicitly add appear here. Suggested-folder changes never alter an existing feed.
      </p>
      <form className="inline-form" onSubmit={createFolder}>
        <label htmlFor="folder-name">New folder</label>
        <input id="folder-name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Use a neutral name" />
        <button className="button" type="submit">Create</button>
      </form>
      {status && <p className="form-status">{status}</p>}
      <div className="folder-grid">
        {folders.map((folder) => (
          <a className="folder-card" href={`#/folders/${folder.id}`} key={folder.id}>
            <span>{folder.item_count} {folder.item_count === 1 ? 'session' : 'sessions'}</span>
            <h2>{folder.name}</h2>
            <p>Open folder →</p>
          </a>
        ))}
      </div>
      <div className="suggested">
        <p className="eyebrow">Possible future packs</p>
        {SUGGESTED_FOLDERS.map((folder) => (
          <div key={folder.name}><strong>{folder.name}</strong><span>{folder.detail}</span><em>Suggestion only</em></div>
        ))}
      </div>
    </section>
  );
}

interface FolderPageProps extends FoldersPageProps { id: string; foldersStatus: FoldersStatus }

function FolderPage({ id, accountNumber, folders, refreshFolders, foldersStatus }: FolderPageProps) {
  const folder = folders.find((candidate) => candidate.id === id);
  const [status, setStatus] = useState('');
  if (!accountNumber) return <FoldersPage accountNumber={null} folders={[]} refreshFolders={refreshFolders} />;
  if (!folder) {
    // Folders arrive asynchronously on a fresh page load — only claim the
    // folder is missing once we actually know what the account contains.
    if (foldersStatus === 'loading' || foldersStatus === 'idle') {
      return <section className="page empty-state"><p className="eyebrow">Private folder</p><h1>Loading your folders…</h1></section>;
    }
    if (foldersStatus === 'error') {
      return (
        <section className="page empty-state">
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

  return (
    <section className="page">
      <a className="back-link" href="#/folders">← Folders</a>
      <p className="eyebrow">Private folder</p>
      <h1>{folder.name}</h1>
      <p className="page__intro">
        Use a neutral name: it appears in podcast apps and is visible to anyone holding the feed link.
      </p>
      {(folder.items ?? []).length ? (
        <div className="folder-items">
          {(folder.items ?? []).map((item) => {
            const entry = getCatalogEntry(item.catalog_id);
            return entry ? (
              <div className="folder-item" key={item.catalog_id}>
                <span>{item.position}</span>
                <div><a href={`#/s/${entry.id}`}>{entry.title}</a><small>{entry.scenario}</small></div>
                <button type="button" onClick={() => removeItem(item.catalog_id)}>Remove</button>
              </div>
            ) : null;
          })}
        </div>
      ) : <p className="empty-copy">No sessions yet. Open any catalog session and add it here.</p>}
      {status && <p className="form-status">{status}</p>}
      <SubscribePanel token={folder.feed_token} />
      <button className="text-button text-button--danger" type="button" onClick={rotateToken}>Rotate private feed link</button>
    </section>
  );
}

function SubscribePage({ token }: { token: string }) {
  return (
    <section className="page subscribe-page">
      <a className="brand brand--center" href="#/"><span className="brand__mark">e</span><span>Eardium</span></a>
      <SubscribePanel token={token} compact />
      <p className="subscribe-page__foot">No account number is read or stored on this handoff page.</p>
    </section>
  );
}

interface AccountPageProps {
  accountNumber: string | null;
  setAccountNumber: (value: string | null) => void;
  setFolders: (folders: Folder[]) => void;
}

function AccountPage({ accountNumber, setAccountNumber, setFolders }: AccountPageProps) {
  const [input, setInput] = useState('');
  const [email, setEmail] = useState('');
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

  async function copyNumber(): Promise<void> {
    if (!accountNumber) return;
    try {
      await navigator.clipboard.writeText(accountNumber);
      setStatus('Account number copied.');
    } catch {
      setStatus('Copying failed — select and copy the number above manually.');
    }
  }

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
    <section className="page account-page">
      <p className="eyebrow">Number-only account</p>
      <h1>{accountNumber ? 'Your account' : 'Keep your feeds without giving us your identity.'}</h1>
      <p className="page__intro">
        The account number is the credential. We store only a keyed lookup hash, not the number itself.
      </p>
      {accountNumber ? (
        <div className="credential-card">
          <span>Your saved account number</span>
          <strong>{formatAccountNumber(accountNumber)}</strong>
          <div className="button-row">
            <button className="button button--secondary" type="button" onClick={copyNumber}>Copy</button>
            <button className="text-button" type="button" onClick={() => { clearAccountNumber(); setAccountNumber(null); setFolders([]); }}>Log out on this device</button>
          </div>
        </div>
      ) : (
        <div className="account-grid">
          <div className="account-card">
            <h2>New here</h2>
            <p>Generate a random number and one empty “My Sessions” folder.</p>
            <button className="button" type="button" onClick={create}>Create account</button>
          </div>
          <form className="account-card" onSubmit={login}>
            <h2>Restore folders</h2>
            <label htmlFor="account-number">16-digit account number</label>
            <input id="account-number" inputMode="numeric" autoComplete="off" value={formatAccountNumber(input)} onChange={(e) => setInput(normalizeAccountNumber(e.target.value))} placeholder="0000 0000 0000 0000" />
            <button className="button button--secondary" type="submit">Restore</button>
          </form>
        </div>
      )}
      {createdNumber && <p className="credential-warning">Shown here after creation so you can save it. Losing it means losing access.</p>}
      {status && <p className="form-status">{status}</p>}

      <form className="waitlist" onSubmit={waitlist}>
        <div><p className="eyebrow">Optional and separate</p><h2>Tell me when customisation arrives.</h2><p>This email is not connected to your account, folders, or listening selections. We send one confirmation link, then one message when it&rsquo;s ready &mdash; nothing else. <a href="#/privacy">What we store and why</a>.</p></div>
        <div className="inline-form"><label htmlFor="waitlist-email">Email</label><input id="waitlist-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /><button className="button" type="submit">Send confirmation</button></div>
      </form>
      {accountNumber && <button className="text-button text-button--danger" type="button" onClick={removeAccount}>Delete account and all feeds</button>}
    </section>
  );
}

function NotFoundPage() {
  return <section className="page empty-state"><p className="eyebrow">404</p><h1>That page is not here.</h1><a className="button" href="#/">Return to catalog</a></section>;
}

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
    switch (route.name) {
      case 'home': return <HomePage />;
      case 'category': return <CategoryPage categoryId={route.category} />;
      case 'session': return <SessionPage id={route.id} accountNumber={accountNumber} folders={folders} refreshFolders={refreshFolders} />;
      case 'folders': return <FoldersPage accountNumber={accountNumber} folders={folders} refreshFolders={refreshFolders} />;
      case 'folder': return <FolderPage id={route.id} accountNumber={accountNumber} folders={folders} refreshFolders={refreshFolders} foldersStatus={foldersStatus} />;
      case 'subscribe': return <SubscribePage token={route.token} />;
      case 'account': return <AccountPage accountNumber={accountNumber} setAccountNumber={setAccountNumber} setFolders={setFolders} />;
      case 'impressum': return <ImpressumPage />;
      case 'privacy': return <PrivacyPage />;
      default: return <NotFoundPage />;
    }
  }, [accountNumber, folders, foldersStatus, refreshFolders, route]);

  return (
    <div className="site-shell">
      {!handoffOnly && <PageHeader accountNumber={accountNumber} />}
      <main>{page}</main>
      {handoffOnly && (
        <footer className="footer--minimal">
          <span className="footer__legal">
            <a href="#/impressum">Impressum</a>
            <a href="#/privacy">Privacy</a>
          </span>
        </footer>
      )}
      {!handoffOnly && (
        <footer>
          <span>Eardium · rehearsal for the moment ahead</span>
          <span>Private feeds are capability links. Keep them private.</span>
          <span className="footer__legal">
            <a href="#/impressum">Impressum</a>
            <a href="#/privacy">Privacy</a>
          </span>
        </footer>
      )}
    </div>
  );
}
