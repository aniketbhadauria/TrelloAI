import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Star,
  GitFork,
  Eye,
  GitCommit,
  FileCode,
  CircleDot,
  GitPullRequest,
  ExternalLink,
  Folder,
  File,
  ChevronRight,
  Clock,
  User,
  AlertCircle,
  Loader2,
  RefreshCw,
  BookMarked,
  Lock,
  Search,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

const GH_USER = 'aniketbhadauria';

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function useFetch(url, enabled = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ─── Repo List View ──────────────────────────────────────────

function RepoListView({ onSelectRepo }) {
  const { data: repos, loading, error, refetch } = useFetch(
    `https://api.github.com/users/${GH_USER}/repos?sort=updated&per_page=100`
  );
  const [search, setSearch] = useState('');

  const filtered = repos?.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border/40 bg-white/60 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-200/40 transition-all"
          />
        </div>
        <button
          onClick={refetch}
          className="w-8 h-8 rounded-lg bg-white/60 border border-border/40 flex items-center justify-center hover:bg-white transition-colors shrink-0"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading && !repos ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState message={search ? 'No repositories match your search.' : 'No public repositories found.'} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((repo) => (
            <button
              key={repo.id}
              onClick={() => onSelectRepo(repo)}
              className="text-left rounded-xl border border-border/40 bg-white/50 p-5 hover:border-pink-200/60 hover:shadow-md hover:shadow-pink-500/5 transition-all group"
            >
              <div className="flex items-start gap-3">
                <BookMarked className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground group-hover:text-pink-600 transition-colors truncate">
                      {repo.name}
                    </p>
                    {repo.private && <Lock className="w-3 h-3 text-muted-foreground" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {repo.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-pink-400" />
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" /> {repo.stargazers_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="w-3 h-3" /> {repo.forks_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {timeAgo(repo.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Repo Detail View ────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileCode },
  { id: 'commits', label: 'Commits', icon: GitCommit },
  { id: 'files', label: 'Files', icon: Folder },
  { id: 'issues', label: 'Issues', icon: CircleDot },
  { id: 'pulls', label: 'Pull Requests', icon: GitPullRequest },
];

function RepoDetailView({ repo, onBack }) {
  const [activeTab, setActiveTab] = useState('overview');
  const apiBase = `https://api.github.com/repos/${repo.full_name}`;

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-white/60 border border-border/40 flex items-center justify-center hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold tracking-tight truncate">{repo.full_name}</h2>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {repo.description || 'No description'}
          </p>
        </div>
        <a
          href={repo.html_url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            buttonVariants({ size: "sm" }),
            "gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 hover:opacity-90 border-0 text-white shrink-0"
          )}
        >
          Open on GitHub
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-600 border border-pink-200/60"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && <OverviewTab repo={repo} />}
      {activeTab === 'commits' && <CommitsTab apiBase={apiBase} />}
      {activeTab === 'files' && <FilesTab apiBase={apiBase} htmlUrl={repo.html_url} />}
      {activeTab === 'issues' && <IssuesTab apiBase={apiBase} />}
      {activeTab === 'pulls' && <PullsTab apiBase={apiBase} />}
    </>
  );
}

// ─── Tab Components ──────────────────────────────────────────

function StatBadge({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="w-4 h-4" />
      <span className="font-medium text-foreground">{value ?? '—'}</span>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl border border-border/40 bg-white/50 px-5 py-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function OverviewTab({ repo }) {
  if (!repo) return null;
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/40 bg-white/50 p-6">
        <h3 className="text-lg font-semibold mb-2">{repo.full_name}</h3>
        <p className="text-muted-foreground text-sm mb-4">
          {repo.description || 'No description provided.'}
        </p>
        <div className="flex flex-wrap gap-4">
          <StatBadge icon={Star} value={repo.stargazers_count} label="Stars" />
          <StatBadge icon={GitFork} value={repo.forks_count} label="Forks" />
          <StatBadge icon={Eye} value={repo.watchers_count} label="Watchers" />
          <StatBadge icon={CircleDot} value={repo.open_issues_count} label="Issues" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard label="Language" value={repo.language || 'N/A'} />
        <InfoCard label="Default Branch" value={repo.default_branch} />
        <InfoCard label="Created" value={new Date(repo.created_at).toLocaleDateString()} />
        <InfoCard label="Last Push" value={timeAgo(repo.pushed_at)} />
        <InfoCard label="License" value={repo.license?.spdx_id || 'None'} />
        <InfoCard label="Size" value={`${(repo.size / 1024).toFixed(1)} MB`} />
      </div>

      {repo.topics?.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-white/50 p-6">
          <h4 className="text-sm font-semibold mb-3">Topics</h4>
          <div className="flex flex-wrap gap-2">
            {repo.topics.map((t) => (
              <span key={t} className="rounded-full bg-pink-100/60 text-pink-700 px-3 py-1 text-xs font-medium">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CommitsTab({ apiBase }) {
  const { data: commits, loading, error } = useFetch(`${apiBase}/commits?per_page=30`);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!commits?.length) return <EmptyState message="No commits found." />;

  return (
    <div className="space-y-2">
      {commits.map((commit) => (
        <div
          key={commit.sha}
          className="rounded-xl border border-border/40 bg-white/50 p-4 hover:border-pink-200/60 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{commit.commit.message.split('\n')[0]}</p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  {commit.author?.avatar_url ? (
                    <img src={commit.author.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                  <span>{commit.commit.author.name}</span>
                </div>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{timeAgo(commit.commit.author.date)}</span>
                </div>
              </div>
            </div>
            <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md font-mono shrink-0">
              {commit.sha.slice(0, 7)}
            </code>
          </div>
        </div>
      ))}
    </div>
  );
}

function FilesTab({ apiBase, htmlUrl }) {
  const [path, setPath] = useState('');
  const url = path ? `${apiBase}/contents/${path}` : `${apiBase}/contents`;
  const { data: contents, loading, error } = useFetch(url);

  const breadcrumbs = path ? path.split('/') : [];
  const navigateTo = (newPath) => setPath(newPath);
  const navigateToBreadcrumb = (index) => {
    if (index < 0) { setPath(''); return; }
    setPath(breadcrumbs.slice(0, index + 1).join('/'));
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  if (contents && !Array.isArray(contents)) {
    return (
      <div className="space-y-3">
        <Breadcrumbs crumbs={breadcrumbs} onNavigate={navigateToBreadcrumb} />
        <div className="rounded-xl border border-border/40 bg-white/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30">
            <div className="flex items-center gap-2 text-sm">
              <File className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{contents.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {(contents.size / 1024).toFixed(1)} KB
            </span>
          </div>
          {contents.encoding === 'base64' && contents.content ? (
            <pre className="p-4 text-xs font-mono overflow-x-auto max-h-[60vh] leading-relaxed text-foreground/80">
              {atob(contents.content)}
            </pre>
          ) : (
            <div className="p-4 text-sm text-muted-foreground">
              File too large to display.{' '}
              <a href={contents.html_url || htmlUrl} target="_blank" rel="noreferrer" className="text-pink-500 underline">
                View on GitHub
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  const sorted = contents ? [...contents].sort((a, b) => {
    if (a.type === 'dir' && b.type !== 'dir') return -1;
    if (a.type !== 'dir' && b.type === 'dir') return 1;
    return a.name.localeCompare(b.name);
  }) : [];

  return (
    <div className="space-y-3">
      <Breadcrumbs crumbs={breadcrumbs} onNavigate={navigateToBreadcrumb} />
      <div className="rounded-xl border border-border/40 bg-white/50 overflow-hidden divide-y divide-border/40">
        {sorted.map((item) => (
          <button
            key={item.sha}
            onClick={() => navigateTo(item.path)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
          >
            {item.type === 'dir' ? (
              <Folder className="w-4 h-4 text-pink-500 shrink-0" />
            ) : (
              <File className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <span className="text-sm font-medium truncate">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Breadcrumbs({ crumbs, onNavigate }) {
  return (
    <div className="flex items-center gap-1 text-sm flex-wrap">
      <button onClick={() => onNavigate(-1)} className="text-pink-500 hover:underline font-medium">
        root
      </button>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          <button
            onClick={() => onNavigate(i)}
            className={cn(
              "hover:underline",
              i === crumbs.length - 1 ? "font-medium text-foreground" : "text-pink-500"
            )}
          >
            {crumb}
          </button>
        </span>
      ))}
    </div>
  );
}

function IssuesTab({ apiBase }) {
  const { data: issues, loading, error } = useFetch(`${apiBase}/issues?state=open&per_page=30`);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const onlyIssues = issues?.filter((i) => !i.pull_request) || [];
  if (!onlyIssues.length) return <EmptyState message="No open issues." />;

  return (
    <div className="space-y-2">
      {onlyIssues.map((issue) => (
        <a
          key={issue.id}
          href={issue.html_url}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl border border-border/40 bg-white/50 p-4 hover:border-pink-200/60 transition-colors"
        >
          <div className="flex items-start gap-3">
            <CircleDot className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{issue.title}</p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <span>#{issue.number}</span>
                <span>·</span>
                <span>opened {timeAgo(issue.created_at)}</span>
                <span>·</span>
                <span>{issue.user.login}</span>
              </div>
              {issue.labels?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {issue.labels.map((label) => (
                    <span
                      key={label.id}
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: `#${label.color}20`,
                        color: `#${label.color}`,
                        border: `1px solid #${label.color}40`,
                      }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

function PullsTab({ apiBase }) {
  const { data: pulls, loading, error } = useFetch(`${apiBase}/pulls?state=open&per_page=30`);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!pulls?.length) return <EmptyState message="No open pull requests." />;

  return (
    <div className="space-y-2">
      {pulls.map((pr) => (
        <a
          key={pr.id}
          href={pr.html_url}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl border border-border/40 bg-white/50 p-4 hover:border-pink-200/60 transition-colors"
        >
          <div className="flex items-start gap-3">
            <GitPullRequest className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{pr.title}</p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <span>#{pr.number}</span>
                <span>·</span>
                <span>opened {timeAgo(pr.created_at)}</span>
                <span>·</span>
                <span>{pr.user.login}</span>
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

// ─── Shared States ───────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        GitHub API rate limit may have been reached (60 requests/hour).
      </p>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <CircleDot className="w-8 h-8 text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function GitHubView() {
  const navigate = useNavigate();
  const [selectedRepo, setSelectedRepo] = useState(null);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto page-enter pb-16">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => selectedRepo ? setSelectedRepo(null) : navigate('/boards')}
          className="w-8 h-8 rounded-lg bg-white/60 border border-border/40 flex items-center justify-center hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              GitHub
            </span>{' '}
            {selectedRepo ? 'Repository' : 'Repositories'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {selectedRepo ? selectedRepo.full_name : `All public repositories for ${GH_USER}`}
          </p>
        </div>
        <a
          href={`https://github.com/${GH_USER}`}
          target="_blank"
          rel="noreferrer"
          className={cn(
            buttonVariants({ size: "sm" }),
            "gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 hover:opacity-90 border-0 text-white shrink-0"
          )}
        >
          Profile
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {selectedRepo ? (
        <RepoDetailView repo={selectedRepo} onBack={() => setSelectedRepo(null)} />
      ) : (
        <RepoListView onSelectRepo={setSelectedRepo} />
      )}
    </div>
  );
}
