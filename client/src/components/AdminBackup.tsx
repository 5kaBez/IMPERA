import React, { useState, useEffect } from 'react';

interface Backup {
  id: number;
  name: string;
  fileSizeMB: string;
  userCount: number | null;
  groupCount: number | null;
  lessonCount: number | null;
  createdAt: string;
  source: string;
  createdBy: string;
  restoredCount: number;
}

export function AdminBackup() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/backup/list', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBackups(data.backups || []);
      }
    } catch (err) {
      setError('Failed to load backups');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      const response = await fetch('/api/admin/backup/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setSuccessMessage('✅ Backup created successfully!');
        setTimeout(() => loadBackups(), 1000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create backup');
      }
    } catch (err) {
      setError('Error creating backup');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (backupId: number, backupName: string) => {
    if (!window.confirm(`⚠️ This will restore ALL data from: ${backupName}\n\nAre you absolutely sure?`)) {
      return;
    }

    if (!window.confirm('🔥 Last chance! This will DELETE all current data and restore from backup. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/admin/backup/restore/${backupId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirm: true })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(`✅ ${data.message}`);
        if (data.requiresRestart) {
          setSuccessMessage(prev => prev + '\n⚠️ Server restart required, reloading in 5 seconds...');
          setTimeout(() => window.location.reload(), 5000);
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to restore backup');
      }
    } catch (err) {
      setError('Error restoring backup');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (backupId: number, fileName: string) => {
    window.location.href = `/api/admin/backup/download/${backupId}`;
  };

  const handleDelete = async (backupId: number, backupName: string) => {
    if (!window.confirm(`Delete backup: ${backupName}?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/backup/${backupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setSuccessMessage(`✅ Backup deleted`);
        setTimeout(() => loadBackups(), 500);
      } else {
        setError('Failed to delete backup');
      }
    } catch (err) {
      setError('Error deleting backup');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-backup">
      <h2>📦 Database Backups</h2>
      
      <div className="backup-controls">
        <button
          onClick={handleCreateBackup}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? '⏳ Creating...' : '✚ Create Backup Now'}
        </button>
        <p className="info-text">ℹ️ Automatic backups are created daily at 12:00 and 00:00 (MSK)</p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')}>&times;</button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
          <button onClick={() => setSuccessMessage('')}>&times;</button>
        </div>
      )}

      <div className="backups-list">
        {loading && backups.length === 0 ? (
          <p>Loading backups...</p>
        ) : backups.length === 0 ? (
          <p>No backups yet. Create one to get started!</p>
        ) : (
          <table className="backups-table">
            <thead>
              <tr>
                <th>Backup Name</th>
                <th>Created</th>
                <th>Type</th>
                <th>Size</th>
                <th>Users</th>
                <th>Groups</th>
                <th>Lessons</th>
                <th>Restored</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.id} className="backup-row">
                  <td className="backup-name">{backup.name}</td>
                  <td className="backup-date">
                    {new Date(backup.createdAt).toLocaleString('ru-RU')}
                  </td>
                  <td className="backup-type">
                    {backup.source === 'auto' ? '🤖 Auto' : '👤 Manual'}
                  </td>
                  <td className="backup-size">{backup.fileSizeMB} MB</td>
                  <td className="backup-stat">{backup.userCount || '—'}</td>
                  <td className="backup-stat">{backup.groupCount || '—'}</td>
                  <td className="backup-stat">{backup.lessonCount || '—'}</td>
                  <td className="backup-stat">{backup.restoredCount}x</td>
                  <td className="backup-actions">
                    <button
                      onClick={() => handleDownload(backup.id, backup.name)}
                      className="btn btn-sm btn-info"
                      title="Download backup file"
                    >
                      ⬇️
                    </button>
                    <button
                      onClick={() => handleRestore(backup.id, backup.name)}
                      className="btn btn-sm btn-warning"
                      title="Restore from this backup (DANGEROUS!)"
                    >
                      ↩️
                    </button>
                    <button
                      onClick={() => handleDelete(backup.id, backup.name)}
                      className="btn btn-sm btn-danger"
                      title="Delete backup"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        .admin-backup {
          padding: 20px;
          background: #f5f5f5;
          border-radius: 8px;
        }

        .admin-backup h2 {
          margin: 0 0 15px 0;
          color: #333;
        }

        .backup-controls {
          margin-bottom: 20px;
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .info-text {
          margin: 0;
          font-size: 0.9em;
          color: #666;
        }

        .alert {
          padding: 12px 15px;
          border-radius: 4px;
          margin-bottom: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .alert-error {
          background: #fee;
          border: 1px solid #fcc;
          color: #c33;
        }

        .alert-success {
          background: #efe;
          border: 1px solid #cfc;
          color: #3c3;
        }

        .alert button {
          background: none;
          border: none;
          font-size: 1.5em;
          cursor: pointer;
          color: inherit;
        }

        .btn {
          padding: 8px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.95em;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-sm {
          padding: 6px 10px;
          font-size: 0.85em;
        }

        .btn-info {
          background: #17a2b8;
          color: white;
        }

        .btn-info:hover:not(:disabled) {
          background: #138496;
        }

        .btn-warning {
          background: #ffc107;
          color: #333;
        }

        .btn-warning:hover:not(:disabled) {
          background: #e0a800;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #c82333;
        }

        .backups-list {
          background: white;
          border-radius: 4px;
          overflow: hidden;
        }

        .backups-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9em;
        }

        .backups-table thead {
          background: #f8f9fa;
          border-bottom: 2px solid #dee2e6;
        }

        .backups-table th {
          padding: 10px;
          text-align: left;
          font-weight: 600;
          color: #495057;
        }

        .backups-table td {
          padding: 10px;
          border-bottom: 1px solid #dee2e6;
        }

        .backup-row:hover {
          background: #f8f9fa;
        }

        .backup-name {
          font-family: monospace;
          font-size: 0.85em;
          color: #495057;
        }

        .backup-date {
          white-space: nowrap;
        }

        .backup-type {
          text-align: center;
        }

        .backup-size {
          text-align: right;
        }

        .backup-stat {
          text-align: center;
          color: #666;
        }

        .backup-actions {
          display: flex;
          gap: 5px;
          justify-content: center;
        }

        .backup-actions button {
          margin: 0;
        }
      `}</style>
    </div>
  );
}

export default AdminBackup;
