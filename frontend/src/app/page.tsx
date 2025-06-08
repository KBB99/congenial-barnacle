'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Play, Pause, Settings, Eye, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { World } from '@/lib/types';
import { worldApi } from '@/lib/api';
import { CreateWorldModal } from '@/components/dashboard/CreateWorldModal';
import { WorldCard } from '@/components/dashboard/WorldCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

export default function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const { data: worlds, isLoading, error, refetch } = useQuery({
    queryKey: ['worlds'],
    queryFn: worldApi.getWorlds,
  });

  const handleWorldCreated = () => {
    refetch();
    setShowCreateModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ErrorMessage 
          title="Failed to load worlds"
          message="There was an error loading your worlds. Please try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Generative World
              </h1>
              <span className="ml-2 text-sm text-gray-500">
                God Mode Dashboard
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create World</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="panel">
            <div className="panel-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Eye className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Worlds</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {worlds?.length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <Play className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Running</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {worlds?.filter(w => w.status === 'running').length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <Pause className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Paused</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {worlds?.filter(w => w.status === 'paused').length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Settings className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Agents</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {worlds?.reduce((sum, w) => sum + w.agentCount, 0) || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Worlds Grid */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Your Worlds</h2>
          
          {worlds && worlds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {worlds.map((world, index) => (
                <motion.div
                  key={world.worldId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <WorldCard 
                    world={world} 
                    onUpdate={refetch}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Eye className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No worlds yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first generative world to get started with agent simulations.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                Create Your First World
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="panel-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <Plus className="w-6 h-6 text-blue-500 mb-2" />
                <h4 className="font-medium text-gray-900">Create New World</h4>
                <p className="text-sm text-gray-500">
                  Start a new simulation with custom agents and environments
                </p>
              </button>

              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <Settings className="w-6 h-6 text-purple-500 mb-2" />
                <h4 className="font-medium text-gray-900">Import World</h4>
                <p className="text-sm text-gray-500">
                  Load a world from a saved configuration file
                </p>
              </button>

              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <Eye className="w-6 h-6 text-green-500 mb-2" />
                <h4 className="font-medium text-gray-900">Browse Templates</h4>
                <p className="text-sm text-gray-500">
                  Explore pre-built world templates and scenarios
                </p>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Create World Modal */}
      {showCreateModal && (
        <CreateWorldModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleWorldCreated}
        />
      )}
    </div>
  );
}