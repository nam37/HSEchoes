import React, { useEffect, useState } from "react";
import { api, type AdminStats } from "../lib/api";
import type { SaveSummary } from "../../../shared/src/index";

interface AdminPageProps {
  userEmail: string | null;
  onSignOut: () => Promise<void>;
}

export default function AdminPage({ userEmail, onSignOut }: AdminPageProps): JSX.Element {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [runs, setRuns] = useState<SaveSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData(): Promise<void> {
    try {
      setLoading(true);
      const [statsData, runsData] = await Promise.all([
        api.adminStats(),
        api.adminRuns()
      ]);
      setStats(statsData);
      setRuns(runsData);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(slotId: string): Promise<void> {
    if (!confirm(`Delete run ${slotId}?`)) return;
    try {
      setBusy(true);
      await api.adminDeleteRun(slotId);
      setRuns((prev) => prev.filter((r) => r.slotId !== slotId));
      if (stats) {
        setStats({ ...stats, totalRuns: stats.totalRuns - 1 });
      }
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-shell">
      <nav className="admin-nav">
        <div className="admin-nav-left">
          <span className="admin-nav-title">ADMIN CONSOLE</span>
          <a href="/" className="admin-nav-link">← Back to Game</a>
        </div>
        <div className="admin-nav-right">
          {userEmail && <span className="admin-user-badge">{userEmail}</span>}
          <button onClick={() => void onSignOut()} className="admin-signout">Sign Out</button>
        </div>
      </nav>

      <main className="admin-main">
        {error && <p className="error-banner">{error}</p>}

        {loading ? (
          <p className="admin-loading">Loading data<span className="blink">_</span></p>
        ) : (
          <>
            {stats && (
              <section className="admin-section">
                <h2 className="admin-section-title">Run Statistics</h2>
                <div className="admin-stats-grid">
                  <div className="admin-stat-card">
                    <p className="stat-value">{stats.totalRuns}</p>
                    <p className="stat-label">Total Runs</p>
                  </div>
                  <div className="admin-stat-card stat-active">
                    <p className="stat-value">{stats.activeRuns}</p>
                    <p className="stat-label">Active</p>
                  </div>
                  <div className="admin-stat-card stat-defeat">
                    <p className="stat-value">{stats.defeatedRuns}</p>
                    <p className="stat-label">Defeated</p>
                  </div>
                  <div className="admin-stat-card stat-victory">
                    <p className="stat-value">{stats.victoryRuns}</p>
                    <p className="stat-label">Victory</p>
                  </div>
                </div>
              </section>
            )}

            <section className="admin-section">
              <div className="admin-section-header">
                <h2 className="admin-section-title">All Runs</h2>
                <button onClick={() => void loadData()} disabled={loading}>Refresh</button>
              </div>
              {runs.length === 0 ? (
                <p className="admin-empty">No runs yet.</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Slot</th>
                        <th>Cell</th>
                        <th>Status</th>
                        <th>Mode</th>
                        <th>Updated</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((run) => (
                        <tr key={run.slotId} className={`run-row run-${run.status}`}>
                          <td className="run-slot">{run.slotId}</td>
                          <td>{run.cellId}</td>
                          <td>
                            <span className={`status-badge status-${run.status}`}>
                              {run.status}
                            </span>
                          </td>
                          <td>{run.mode}</td>
                          <td className="run-time">{new Date(run.updatedAt).toLocaleString()}</td>
                          <td>
                            <button
                              className="btn-danger"
                              onClick={() => void handleDelete(run.slotId)}
                              disabled={busy}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
