// src/components/Shell.jsx
// App frame: dark side rail on desktop, title bar + bottom tab bar on phones.
import React, { useState } from 'react';
import Icon from './icons';

const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';

/**
 * items: [{ id, label, icon, group, badge, primary }]
 *   primary: shown in the phone tab bar (the rest go under "More")
 */
export default function Shell({ user, roleLabel, items, active, onSelect, onLogout, children, bare = false }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const current = items.find((i) => i.id === active) || items[0];

  const primary = items.filter((i) => i.primary).slice(0, 4);
  const overflow = items.filter((i) => !primary.includes(i));
  const overflowHasBadge = overflow.some((i) => i.badge);

  const groups = [];
  items.forEach((i) => {
    const g = i.group || '';
    let bucket = groups.find((b) => b.name === g);
    if (!bucket) { bucket = { name: g, items: [] }; groups.push(bucket); }
    bucket.items.push(i);
  });

  const pick = (id) => { onSelect(id); setMoreOpen(false); };

  const navButton = (i) => (
    <button key={i.id} className={`rt-nav${i.id === active ? ' is-active' : ''}`} onClick={() => pick(i.id)}
      aria-current={i.id === active ? 'page' : undefined}>
      <Icon name={i.icon} />
      <span>{i.label}</span>
      {i.badge ? <span className="rt-count">{i.badge}</span> : null}
    </button>
  );

  const userBlock = (
    <>
      <div className="rt-avatar">{initials(user.name)}</div>
      <div>
        <div className="rt-user-name">{user.name}</div>
        <div className="rt-user-sub">{roleLabel}{user.department ? `, ${user.department}` : ''}</div>
      </div>
    </>
  );

  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="rt-app">
      <aside className="rt-rail" aria-label="Main navigation">
        <div className="rt-brand"><span className="rt-mark"><Icon name="clock" size={17} /></span>Rocket Time</div>
        {groups.map((g) => (
          <div key={g.name || 'main'}>
            {g.name && <div className="rt-group">{g.name}</div>}
            {g.items.map(navButton)}
          </div>
        ))}
        <div className="rt-rail-foot">
          <div className="rt-user">{userBlock}</div>
          <button className="rt-nav" onClick={onLogout}><Icon name="logout" /><span>Sign out</span></button>
        </div>
      </aside>

      <div className="rt-main">
        <header className="rt-topbar">
          <div className="rt-top-left">
            <span className="rt-mark rt-top-brand"><Icon name="clock" size={17} /></span>
            <h1>{current.label}</h1>
          </div>
          <span className="rt-date">{today}</span>
        </header>

        <main className="rt-content">
          <div className={`rt-panel${bare ? ' is-bare' : ''}`}>{children}</div>
        </main>
      </div>

      <nav className="rt-bottomnav" aria-label="Main navigation">
        {primary.map((i) => (
          <button key={i.id} className={`rt-bn${i.id === active ? ' is-active' : ''}`} onClick={() => pick(i.id)}
            aria-current={i.id === active ? 'page' : undefined}>
            <Icon name={i.icon} size={22} />
            <span>{i.label}</span>
            {i.badge ? <span className="rt-count">{i.badge}</span> : null}
          </button>
        ))}
        {overflow.length > 0 && (
          <button className={`rt-bn${overflow.some((i) => i.id === active) ? ' is-active' : ''}`} onClick={() => setMoreOpen(true)}>
            <Icon name="more" size={22} />
            <span>More</span>
            {overflowHasBadge ? <span className="rt-count">!</span> : null}
          </button>
        )}
      </nav>

      {moreOpen && (
        <>
          <div className="rt-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="rt-sheet" role="dialog" aria-label="More">
            <div className="rt-sheet-user">{userBlock}</div>
            {overflow.map(navButton)}
            <button className="rt-nav" onClick={onLogout}><Icon name="logout" /><span>Sign out</span></button>
          </div>
        </>
      )}
    </div>
  );
}
