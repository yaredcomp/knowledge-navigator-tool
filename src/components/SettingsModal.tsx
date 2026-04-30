'use client';

import { useState, useEffect, FormEvent } from 'react';
import { LLMProviderType } from '@/types/llm';

interface LLMProviderSettings {
  groq: { apiKey: string; model: string; enabled: boolean };
  openrouter: { apiKey: string; model: string; enabled: boolean };
  ollama: { host: string; model: string; enabled: boolean };
}

interface ModelInfo {
  id: string;
  name: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: LLMProviderSettings) => void;
}

export default function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const [settings, setSettings] = useState<LLMProviderSettings>({
    groq: { apiKey: '', model: '', enabled: true },
    openrouter: { apiKey: '', model: '', enabled: true },
    ollama: { host: 'http://localhost:11434', model: '', enabled: true },
  });

  const [activeTab, setActiveTab] = useState<LLMProviderType>('groq');
  const [isSaving, setIsSaving] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  const [ollamaModels, setOllamaModels] = useState<ModelInfo[]>([]);
  const [groqModels, setGroqModels] = useState<ModelInfo[]>([]);
  const [openrouterModels, setOpenrouterModels] = useState<ModelInfo[]>([]);

  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('llm_provider_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSettings((prev) => ({ ...prev, ...parsed }));
        } catch {}
      }
      fetchModels();
    }
  }, [isOpen]);

  const fetchModels = async () => {
    setLoadingModels(true);
    setFetchError(null);

    await Promise.all([
      fetchOllamaModels(),
      fetchGroqModels(),
      fetchOpenRouterModels(),
    ]);

    setLoadingModels(false);
  };

  const fetchOllamaModels = async () => {
    try {
      const host = settings.ollama.host || 'http://localhost:11434';
      const response = await fetch(`${host}/api/tags`, { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        const models = data.models?.map((m: { name: string }) => ({
          id: m.name,
          name: m.name,
        })) || [];
        setOllamaModels(models);
        if (models.length > 0 && !settings.ollama.model) {
          setSettings((p) => ({ ...p, ollama: { ...p.ollama, model: models[0].id } }));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch Ollama models:', err);
      setOllamaModels([]);
    }
  };

  const fetchGroqModels = async () => {
    try {
      const apiKey = settings.groq.apiKey || localStorage.getItem('groq_api_key') || '';
      if (!apiKey) {
        setGroqModels([]);
        return;
      }
      
      localStorage.setItem('groq_api_key', apiKey);
      
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        const models = data.data?.map((m: { id: string }) => ({
          id: m.id,
          name: m.id,
        })) || [];
        setGroqModels(models);
        if (models.length > 0 && !settings.groq.model) {
          setSettings((p) => ({ ...p, groq: { ...p.groq, model: models[0].id } }));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch Groq models:', err);
      setGroqModels([]);
    }
  };

  const fetchOpenRouterModels = async () => {
    try {
      const apiKey = settings.openrouter.apiKey || localStorage.getItem('openrouter_api_key') || '';
      if (!apiKey) {
        setOpenrouterModels([]);
        return;
      }

      localStorage.setItem('openrouter_api_key', apiKey);

      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.data?.map((m: { id: string; name?: string }) => ({
          id: m.id,
          name: m.name || m.id,
        })) || [];
        setOpenrouterModels(models);
        if (models.length > 0 && !settings.openrouter.model) {
          setSettings((p) => ({ ...p, openrouter: { ...p.openrouter, model: models[0].id } }));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch OpenRouter models:', err);
      setOpenrouterModels([]);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    
    localStorage.setItem('llm_provider_settings', JSON.stringify(settings));
    localStorage.setItem('groq_api_key', settings.groq.apiKey);
    localStorage.setItem('openrouter_api_key', settings.openrouter.apiKey);
    
    onSave(settings);
    setIsSaving(false);
    onClose();
  };

  const handleOllamaHostChange = (host: string) => {
    setSettings((p) => ({ ...p, ollama: { ...p.ollama, host } }));
  };

  const handleRefreshModels = () => {
    fetchModels();
  };

  if (!isOpen) return null;

  const tabs: { id: LLMProviderType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'groq',
      label: 'Groq',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: 'openrouter',
      label: 'OpenRouter',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
    },
    {
      id: 'ollama',
      label: 'Ollama',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl animate-fade-in overflow-hidden max-h-[90vh] flex flex-col">
        <div className="relative p-6 border-b border-[var(--border-subtle)] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>
                LLM Settings
              </h2>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">
                Configure AI model providers for query processing
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--bg-card)] transition-colors"
            >
              <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex border-b border-[var(--border-subtle)] flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-[var(--accent-gold)] border-b-2 border-[var(--accent-gold)] bg-[var(--accent-gold)]/5'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1">
          {activeTab === 'groq' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">API Key</label>
                <input
                  type="password"
                  value={settings.groq.apiKey}
                  onChange={(e) => setSettings((p) => ({ ...p, groq: { ...p.groq, apiKey: e.target.value } }))}
                  placeholder="gsk_..."
                  className="w-full"
                />
                <p className="text-xs text-[var(--text-tertiary)] mt-1">Get key from console.groq.com</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">Model</label>
                  <button
                    type="button"
                    onClick={fetchGroqModels}
                    disabled={loadingModels || !settings.groq.apiKey}
                    className="text-xs text-[var(--accent-gold)] hover:underline disabled:opacity-50"
                  >
                    {loadingModels ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                {groqModels.length > 0 ? (
                  <select
                    value={settings.groq.model}
                    onChange={(e) => setSettings((p) => ({ ...p, groq: { ...p.groq, model: e.target.value } }))}
                    className="w-full"
                  >
                    {groqModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-[var(--text-tertiary)] p-3 bg-[var(--bg-card)] rounded-lg">
                    {settings.groq.apiKey ? 'No models available or loading...' : 'Enter API key to load models'}
                  </div>
                )}
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.groq.enabled}
                  onChange={(e) => setSettings((p) => ({ ...p, groq: { ...p.groq, enabled: e.target.checked } }))}
                  className="w-4 h-4 rounded border-[var(--border-medium)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">Enable Groq</span>
              </label>
            </div>
          )}

          {activeTab === 'openrouter' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">API Key</label>
                <input
                  type="password"
                  value={settings.openrouter.apiKey}
                  onChange={(e) => setSettings((p) => ({ ...p, openrouter: { ...p.openrouter, apiKey: e.target.value } }))}
                  placeholder="sk-..."
                  className="w-full"
                />
                <p className="text-xs text-[var(--text-tertiary)] mt-1">Get key from openrouter.ai/keys</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">Model</label>
                  <button
                    type="button"
                    onClick={fetchOpenRouterModels}
                    disabled={loadingModels || !settings.openrouter.apiKey}
                    className="text-xs text-[var(--accent-gold)] hover:underline disabled:opacity-50"
                  >
                    {loadingModels ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                {openrouterModels.length > 0 ? (
                  <select
                    value={settings.openrouter.model}
                    onChange={(e) => setSettings((p) => ({ ...p, openrouter: { ...p.openrouter, model: e.target.value } }))}
                    className="w-full"
                  >
                    {openrouterModels.slice(0, 50).map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-[var(--text-tertiary)] p-3 bg-[var(--bg-card)] rounded-lg">
                    {settings.openrouter.apiKey ? 'No models available or loading...' : 'Enter API key to load models'}
                  </div>
                )}
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.openrouter.enabled}
                  onChange={(e) => setSettings((p) => ({ ...p, openrouter: { ...p.openrouter, enabled: e.target.checked } }))}
                  className="w-4 h-4 rounded border-[var(--border-medium)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">Enable OpenRouter</span>
              </label>
            </div>
          )}

          {activeTab === 'ollama' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">Host URL</label>
                  <button
                    type="button"
                    onClick={fetchOllamaModels}
                    disabled={loadingModels}
                    className="text-xs text-[var(--accent-gold)] hover:underline disabled:opacity-50"
                  >
                    {loadingModels ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                <input
                  type="text"
                  value={settings.ollama.host}
                  onChange={(e) => handleOllamaHostChange(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full"
                  onBlur={fetchOllamaModels}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Model</label>
                {ollamaModels.length > 0 ? (
                  <select
                    value={settings.ollama.model}
                    onChange={(e) => setSettings((p) => ({ ...p, ollama: { ...p.ollama, model: e.target.value } }))}
                    className="w-full"
                  >
                    {ollamaModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-[var(--text-tertiary)] p-3 bg-[var(--bg-card)] rounded-lg">
                    {loadingModels ? 'Connecting to Ollama...' : 'No models found. Make sure Ollama is running.'}
                  </div>
                )}
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.ollama.enabled}
                  onChange={(e) => setSettings((p) => ({ ...p, ollama: { ...p.ollama, enabled: e.target.checked } }))}
                  className="w-4 h-4 rounded border-[var(--border-medium)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">Enable Ollama (fallback)</span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-gold-dark)] text-[var(--bg-primary)] text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}