import React, { useState, useEffect } from 'react';
import { 
  BeakerIcon, 
  PlusIcon,
  RocketLaunchIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../services/apiService';

const Prototypes = () => {
  const [prototypes, setPrototypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrototypes();
  }, []);

  const loadPrototypes = async () => {
    try {
      const response = await apiService.getPrototypes();
      setPrototypes(response.data.prototypes || []);
    } catch (error) {
      console.error('Failed to load prototypes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Prototypes
        </h1>
        <button className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-1" />
          New
        </button>
      </div>

      <div className="space-y-3">
        {prototypes.length > 0 ? (
          prototypes.map((prototype) => (
            <PrototypeCard
              key={prototype.id}
              prototype={prototype}
            />
          ))
        ) : (
          <div className="card text-center py-8">
            <BeakerIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No prototypes yet
            </h3>
            <p className="text-gray-500">
              Create your first prototype to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const PrototypeCard = ({ prototype }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'deployed': return 'green';
      case 'draft': return 'yellow';
      case 'building': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <div className="card-mobile">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {prototype.name}
          </h3>
          <p className="text-sm text-gray-500">
            {prototype.project_type}
          </p>
        </div>
        <span className={`badge badge-${getStatusColor(prototype.status)}`}>
          {prototype.status}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {prototype.description}
      </p>

      <div className="flex space-x-2">
        <button className="btn-primary flex-1">
          <RocketLaunchIcon className="h-4 w-4 mr-1" />
          Deploy
        </button>
        <button className="btn-secondary">
          Edit
        </button>
        <button className="btn-secondary">
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Prototypes;