-- ============================================================================
-- VICECITYHUB.EU - COMPLETE TURSO (libSQL / SQLite) DATABASE SCHEMA
-- Instance: libsql://vicecityhub-calinaboss.aws-eu-central-1.turso.io
-- Security: OWASP Hardened, Indexed for Turso Free Tier Quota Optimization
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. USERS TABLE (PBKDF2-HMAC-SHA256 100,000 iterations)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  avatar_url TEXT,
  banner_color TEXT NOT NULL DEFAULT '#ff2a85',
  bio TEXT DEFAULT '',
  discord_handle TEXT DEFAULT '',
  social_links TEXT DEFAULT '{}',
  followers_count INTEGER NOT NULL DEFAULT 0,
  following_count INTEGER NOT NULL DEFAULT 0,
  is_banned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 2. SESSIONS TABLE (SHA-256 hashed tokens, HttpOnly + Secure cookies)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  ip_hash TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 3. COMMUNITY POSTS TABLE (Feed discussions, Map discoveries, Official news)
CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  category TEXT NOT NULL DEFAULT 'discussions',
  category_label TEXT NOT NULL DEFAULT 'Discussions',
  pinned INTEGER NOT NULL DEFAULT 0,
  author TEXT NOT NULL,
  username TEXT NOT NULL,
  badge TEXT DEFAULT 'Member',
  badge_class TEXT DEFAULT 'verified',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  likes_count INTEGER NOT NULL DEFAULT 1,
  bookmarks_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_feed ON community_posts(status, pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON community_posts(category, created_at DESC);

-- 4. POST LIKES TABLE (Unique constraint prevents duplicate like spam)
CREATE TABLE IF NOT EXISTS post_likes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT,
  actor_fingerprint TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(post_id, actor_fingerprint),
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);

-- 5. POST BOOKMARKS TABLE
CREATE TABLE IF NOT EXISTS post_bookmarks (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT,
  actor_fingerprint TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(post_id, actor_fingerprint),
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_post_bookmarks_post ON post_bookmarks(post_id);

-- 6. COMMUNITY COMMENTS TABLE
CREATE TABLE IF NOT EXISTS community_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT,
  author TEXT NOT NULL,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON community_comments(post_id, created_at ASC);

-- 7. DISCORD SERVERS DIRECTORY TABLE
CREATE TABLE IF NOT EXISTS discord_servers (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  country TEXT NOT NULL DEFAULT 'intl',
  country_label TEXT NOT NULL DEFAULT 'International',
  invite_url TEXT NOT NULL,
  members TEXT NOT NULL DEFAULT 'Verified Community',
  description TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_discords_list ON discord_servers(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discords_filter ON discord_servers(country, category);

-- 8. CONTENT REPORTS / EU DSA TAKEDOWN REQUESTS TABLE
CREATE TABLE IF NOT EXISTS security_reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  reporter_ip_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 9. DISTRIBUTED RATE LIMITING TABLE (OWASP DoS & Brute-Force Protection)
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);

-- 10. CYBERSECURITY AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_id TEXT,
  ip_hash TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- 11. USER FOLLOWS TABLE (Followers & Following Graph)
CREATE TABLE IF NOT EXISTS user_follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(follower_id, following_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON user_follows(following_id);

-- 12. ACCOUNT SUPPORT & ASSISTANCE TICKETS TABLE
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  username TEXT,
  email TEXT NOT NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  ip_hash TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
