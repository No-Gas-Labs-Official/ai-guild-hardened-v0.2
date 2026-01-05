import React, { useState, useEffect } from 'react';
import { 
  CodeBracketIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../services/apiService';

const Repositories = () => {
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadRepositories();
  }, []);

  const loadRepositories = async () => {
    try {
      const response = await apiService.getRepositories();
      setRepositories(response.data.repositories || []);
    } catch (error) {
      console.error('Failed to load repositories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRepository = async (e) => {
    e.preventDefault();
    
    if (!newRepoUrl.trim()) {
      return;
    }

    setAdding(true);
    try {
      await apiService.addRepository({ url: newRepoUrl });
      setNewRepoUrl('');
      setShowAddForm(false);
      loadRepositories();
    } catch (error) {
      console.error('Failed to add repository:', error);
      alert('Failed to add repository. Please check the URL and try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleScanRepository = async (repoId) => {
    try {
      await apiService.scanRepository(repoId);
      loadRepositories();
    } catch (error) {
      console.error('Failed to scan repository:', error);
    }
  };

  const filteredRepositories = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.owner.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="px-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Repositories
          </h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            Add
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-mobile pl-10"
          />
        </div>
      </div>

      {/* Add Repository Form */}
      {showAddForm && (
        <div className="card-mobile mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Add Repository
            </h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleAddRepository}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GitHub Repository URL
              </label>
              <input
                type="url"
                placeholder="https://github.com/user/repo"
                value={newRepoUrl}
                onChange={(e) => setNewRepoUrl(e.target.value)}
                className="input-mobile"
                required
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={adding}
                className="btn-primary flex-1"
              >
                {adding ? 'Adding...' : 'Add Repository'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Repository List */}
      <div className="space-y-3">
        {filteredRepositories.length > 0 ? (
          filteredRepositories.map((repo) => (
            <RepositoryCard
              key={repo.id}
              repository={repo}
              onScan={() => handleScanRepository(repo.id)}
            />
          ))
        ) : (
          <div className="card text-center py-8">
            <CodeBracketIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No repositories found
            </h3>
            <p className="text-gray-500 mb-4">
              Add your first GitHub repository to get started
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              Add Repository
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Repository Card Component
const RepositoryCard = ({ repository, onScan }) => {
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    await onScan();
    setScanning(false);
  };

  const getHealthStatus = (repo) => {
    if (!repo.last_scanned) {
      return { status: 'unknown', color: 'gray', text: 'Not scanned' };
    }
    
    const lastScanned = new Date(repo.last_scanned);
    const now = new Date();
    const hoursDiff = (now - lastScanned) / (1000 * 60 * 60);
    
    if (hoursDiff <= 24) {
      return { status: 'healthy', color: 'green', text: 'Healthy' };
    } else if (hoursDiff <= 72) {
      return { status: 'warning', color: 'yellow', text: 'Needs scan' };
    } else {
      return { status: 'error', color: 'red', text: 'Stale' };
    }
  };

  const health = getHealthStatus(repository);

  return (
    <div className="card-mobile">
      {/* Repository Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {repository.name}
          </h3>
          <p className="text-sm text-gray-500">
            {repository.owner}
          </p>
        </div>
        <span className={`badge badge-${health.color}`}>
          {health.text}
        </span>
      </div>

      {/* Repository Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            {repository.stars || 0}
          </p>
          <p className="text-xs text-gray-500">Stars</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            {repository.forks || 0}
          </p>
          <p className="text-xs text-gray-500">Forks</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            {repository.language || 'N/A'}
          </p>
          <p className="text-xs text-gray-500">Language</p>
        </div>
      </div>

      {/* Last Scanned */}
      {repository.last_scanned && (
        <div className="mb-4">
          <p className="text-xs text-gray-500">
            Last scanned: {new Date(repository.last_scanned).toLocaleString()}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2">
        <button
          onClick={handleScan}
          disabled={scanning}
          className="btn-primary flex-1 text-sm"
        >
          {scanning ? (
            <>
              <div className="spinner-sm mr-1"></div>
              Scanning...
            </>
          ) : (
            'Scan Now'
          )}
        </button>
        <button className="btn-secondary text-sm">
          <EyeIcon className="h-4 w-4" />
        </button>
        <button className="btn-secondary text-sm">
          <DocumentArrowDownIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Repositories;