'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { CreateWorldForm } from '@/lib/types';
import { worldApi } from '@/lib/api';

interface CreateWorldModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const WORLD_TEMPLATES = [
  {
    id: 'smalltown',
    name: 'Small Town',
    description: 'A cozy small town with 10-15 agents living their daily lives',
    settings: {
      timeSpeed: 1.0,
      maxAgents: 25,
      worldSize: { width: 800, height: 600 },
      physics: { gravity: false, collision: true },
    },
  },
  {
    id: 'office',
    name: 'Office Building',
    description: 'A corporate office environment with employees and meetings',
    settings: {
      timeSpeed: 2.0,
      maxAgents: 50,
      worldSize: { width: 1000, height: 800 },
      physics: { gravity: false, collision: true },
    },
  },
  {
    id: 'university',
    name: 'University Campus',
    description: 'A bustling university with students, professors, and staff',
    settings: {
      timeSpeed: 1.5,
      maxAgents: 100,
      worldSize: { width: 1200, height: 1000 },
      physics: { gravity: false, collision: true },
    },
  },
  {
    id: 'custom',
    name: 'Custom World',
    description: 'Create your own world from scratch',
    settings: {
      timeSpeed: 1.0,
      maxAgents: 50,
      worldSize: { width: 1000, height: 800 },
      physics: { gravity: false, collision: true },
    },
  },
];

export function CreateWorldModal({ onClose, onSuccess }: CreateWorldModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(WORLD_TEMPLATES[0]);
  const [step, setStep] = useState<'template' | 'details'>('template');

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<CreateWorldForm>({
    defaultValues: {
      name: '',
      description: '',
      template: selectedTemplate.id,
      settings: selectedTemplate.settings,
    },
  });

  const createMutation = useMutation({
    mutationFn: worldApi.createWorld,
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      console.error('Failed to create world:', error);
    },
  });

  const handleTemplateSelect = (template: typeof WORLD_TEMPLATES[0]) => {
    setSelectedTemplate(template);
    setValue('template', template.id);
    setValue('settings', template.settings);
    setStep('details');
  };

  const onSubmit = (data: CreateWorldForm) => {
    createMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Create New World
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {step === 'template' ? (
            /* Template Selection */
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Choose a Template
              </h3>
              <p className="text-gray-600 mb-6">
                Select a pre-configured world template to get started quickly, or create a custom world from scratch.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {WORLD_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
                  >
                    <h4 className="font-medium text-gray-900 mb-2">
                      {template.name}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {template.description}
                    </p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Max Agents: {template.settings.maxAgents}</div>
                      <div>Size: {template.settings.worldSize.width}×{template.settings.worldSize.height}</div>
                      <div>Speed: {template.settings.timeSpeed}×</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* World Details Form */
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  World Details
                </h3>
                <p className="text-gray-600 mb-6">
                  Configure your {selectedTemplate.name.toLowerCase()} world.
                </p>
              </div>

              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <label className="form-label">
                    World Name *
                  </label>
                  <input
                    type="text"
                    {...register('name', { required: 'World name is required' })}
                    className="form-input"
                    placeholder="Enter a name for your world"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="form-input"
                    placeholder="Describe your world and its purpose"
                  />
                </div>
              </div>

              {/* World Settings */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">World Settings</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      Time Speed
                    </label>
                    <select
                      {...register('settings.timeSpeed', { valueAsNumber: true })}
                      className="form-input"
                    >
                      <option value={0.5}>0.5× (Slow)</option>
                      <option value={1.0}>1.0× (Normal)</option>
                      <option value={1.5}>1.5× (Fast)</option>
                      <option value={2.0}>2.0× (Very Fast)</option>
                      <option value={5.0}>5.0× (Ultra Fast)</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">
                      Max Agents
                    </label>
                    <input
                      type="number"
                      {...register('settings.maxAgents', { 
                        valueAsNumber: true,
                        min: 1,
                        max: 1000 
                      })}
                      className="form-input"
                      min="1"
                      max="1000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      World Width
                    </label>
                    <input
                      type="number"
                      {...register('settings.worldSize.width', { 
                        valueAsNumber: true,
                        min: 400,
                        max: 2000 
                      })}
                      className="form-input"
                      min="400"
                      max="2000"
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      World Height
                    </label>
                    <input
                      type="number"
                      {...register('settings.worldSize.height', { 
                        valueAsNumber: true,
                        min: 300,
                        max: 1500 
                      })}
                      className="form-input"
                      min="300"
                      max="1500"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-medium text-gray-900">Physics Settings</h5>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('settings.physics.collision')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      Enable collision detection
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('settings.physics.gravity')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      Enable gravity (experimental)
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setStep('template')}
                  className="btn-secondary"
                >
                  Back to Templates
                </button>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="btn-primary flex items-center space-x-2"
                  >
                    {createMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Create World</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}