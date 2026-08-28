import React, { useState, useEffect, useRef } from 'react';
import type { SyncSettings, SyncProvider, Language, Theme } from '../types';
import { translations } from '../utils/translations';
import { 
  X, RefreshCw, CheckCircle, AlertTriangle, ExternalLink, 
  Sun, Moon, Monitor, Globe, Settings as SettingsIcon,
  Upload, Download
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncSettings: SyncSettings;
  onSaveSyncSettings: (settings: SyncSettings) => void;
  onTestSync: (settings: SyncSettings) => Promise<string>;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  syncSettings,
  onSaveSyncSettings,
  onTestSync,
  language,
  onLanguageChange,
  theme,
  onThemeChange,
  onExportData,
  onImportData,
}) => {
  const [provider, setProvider] = useState<SyncProvider>(syncSettings.provider);
  const [token, setToken] = useState(syncSettings.token);
  const [targetId, setTargetId] = useState(syncSettings.targetId);
  const [customUrl, setCustomUrl] = useState(syncSettings.customUrl || '');
  const [projectPath, setProjectPath] = useState(syncSettings.projectPath || '');

  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language];

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (isOpen) {
      setProvider(syncSettings.provider);
      setToken(syncSettings.token);
      setTargetId(syncSettings.targetId);
      setCustomUrl(syncSettings.customUrl || '');
      setProjectPath(syncSettings.projectPath || '');
      setStatus('idle');
      setErrorMessage('');
    }
  }, [isOpen, syncSettings]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setStatus('idle');
    setErrorMessage('');

    if (provider === 'none') {
      onSaveSyncSettings({ provider: 'none', token: '', targetId: '', customUrl: '', projectPath: '' });
      setTesting(false);
      setStatus('success');
      return;
    }

    if (!token.trim()) {
      setStatus('error');
      setErrorMessage(language === 'ca' ? 'El token no pot estar buit.' : 'Token cannot be empty.');
      setTesting(false);
      return;
    }

    try {
      const activeSettings: SyncSettings = {
        provider,
        token: token.trim(),
        targetId: targetId.trim(),
        customUrl: provider === 'gitlab' ? customUrl.trim() : undefined,
        projectPath: provider === 'gitlab' ? projectPath.trim() : undefined,
      };

      const finalId = await onTestSync(activeSettings);
      
      const savedSettings = { ...activeSettings, targetId: finalId };
      setTargetId(finalId);
      onSaveSyncSettings(savedSettings);
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || (language === 'ca' ? 'La prova de connexió ha fallat. Revisa els permisos.' : 'Connection test failed. Check token/permissions.'));
    } finally {
      setTesting(false);
    }
  };

  const docsUrl = provider === 'github'
    ? 'https://github.com/settings/tokens'
    : 'https://gitlab.com/-/profile/personal_access_tokens';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg glass-panel rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">{t.settings}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800 dark:text-slate-100">
          
          {/* Section 1: General Settings */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800/80 pb-2">
              {t.generalSettings}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Language Switcher */}
              <div className="space-y-1.5 text-xs">
                <label className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{t.language}</span>
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-200/50 dark:bg-slate-900/60 p-1 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => onLanguageChange('en')}
                    className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all ${
                      language === 'en'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold shadow-md'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => onLanguageChange('ca')}
                    className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all ${
                      language === 'ca'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold shadow-md'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                    }`}
                  >
                    Català
                  </button>
                </div>
              </div>

              {/* Theme Switcher */}
              <div className="space-y-1.5 text-xs">
                <label className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{t.theme}</span>
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-200/50 dark:bg-slate-900/60 p-1 border border-slate-200 dark:border-slate-800 rounded-xl">
                  {([
                    { key: 'light', label: t.light, icon: <Sun className="w-3 h-3" /> },
                    { key: 'dark', label: t.dark, icon: <Moon className="w-3 h-3" /> },
                    { key: 'system', label: t.system, icon: <Monitor className="w-3 h-3" /> }
                  ] as const).map(({ key, label, icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onThemeChange(key)}
                      className={`py-1.5 px-1.5 text-[10px] font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                        theme === key
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold shadow-md'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                      }`}
                    >
                      {icon}
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Sync Settings */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800/80 pb-2">
              {t.syncSettingsHeader}
            </h4>

            {/* Form */}
            <form onSubmit={handleTestAndSave} className="space-y-4">
              {/* Provider Selection */}
              <div className="space-y-1.5 text-xs">
                <label className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t.syncProvider}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['none', 'github', 'gitlab'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setProvider(p);
                        if (p === 'none') {
                          setToken('');
                          setTargetId('');
                          setCustomUrl('');
                          setProjectPath('');
                        }
                      }}
                      className={`py-2 px-3 text-xs font-medium rounded-xl border capitalize transition-all ${
                        provider === p
                          ? 'bg-indigo-600/10 border-indigo-500/80 text-indigo-650 dark:text-indigo-200 font-semibold shadow-md'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {p === 'none' ? t.noneLocal : p}
                    </button>
                  ))}
                </div>
              </div>

              {provider !== 'none' && (
                <div className="space-y-4 animate-fade-in text-xs">
                  {/* Token Access Docs Link */}
                  <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-900/60 p-3 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-start gap-2.5">
                    <ExternalLink className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      {t.gistScopeNotice(provider)}
                      <a 
                        href={docsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block text-indigo-500 dark:text-indigo-400 hover:text-indigo-400 dark:hover:text-indigo-300 underline font-medium mt-1 font-semibold"
                      >
                        {t.generateToken} &rarr;
                      </a>
                    </div>
                  </div>

                  {/* Custom GitLab URL */}
                  {provider === 'gitlab' && (
                    <div className="space-y-1.5">
                      <label className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t.gitlabUrl}</label>
                      <input
                        type="url"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="https://gitlab.com"
                        className="w-full bg-slate-100/50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/80 placeholder-slate-400 dark:placeholder-slate-600 transition"
                      />
                    </div>
                  )}

                  {/* Project path — switches sync to project snippets */}
                  {provider === 'gitlab' && (
                    <div className="space-y-1.5">
                      <label className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t.gitlabProject}</label>
                      <input
                        type="text"
                        value={projectPath}
                        onChange={(e) => setProjectPath(e.target.value)}
                        placeholder={t.gitlabProjectPlaceholder}
                        className="w-full bg-slate-100/50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/80 placeholder-slate-400 dark:placeholder-slate-600 transition font-mono"
                      />
                    </div>
                  )}

                  {/* Personal Access Token */}
                  <div className="space-y-1.5">
                    <label className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {language === 'ca' ? "Token d'Accés Personal" : 'Personal Access Token'}
                    </label>
                    <input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder={t.tokenPlaceholder}
                      required
                      className="w-full bg-slate-100/50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/80 placeholder-slate-400 dark:placeholder-slate-600 transition"
                    />
                  </div>

                  {/* Target Snippet/Gist ID */}
                  <div className="space-y-1.5">
                    <label className="font-semibold uppercase tracking-wider text-slate-550 dark:text-slate-400">
                      {language === 'ca' ? 'ID de Gist / Snippet (Opcional)' : 'Gist / Snippet ID (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      placeholder={t.gistIdPlaceholder}
                      className="w-full bg-slate-100/50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/80 placeholder-slate-400 dark:placeholder-slate-600 transition font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Status indicators */}
              {status === 'success' && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 rounded-xl text-xs font-medium">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <span>{t.connectedSuccess}</span>
                </div>
              )}

              {status === 'error' && (
                <div className="flex items-start gap-2.5 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-650 dark:text-rose-455 rounded-xl text-xs">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/10 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-700 dark:hover:text-slate-350 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={testing}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-slate-50 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition duration-150 flex items-center gap-2 shadow-lg shadow-indigo-600/10"
                >
                  {testing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {provider === 'none' ? t.disconnect : testing ? t.testing : t.testSave}
                </button>
              </div>
            </form>
          </div>

          {/* Section 3: Backup / Restore (Local Backup) */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800/80 pb-2">
              {t.localBackup}
            </h4>
            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={onImportData}
                accept=".json"
                className="hidden"
              />
              <button
                type="button"
                onClick={handleImportClick}
                className="flex-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition text-xs font-bold shadow-sm dark:shadow-none cursor-pointer"
                title={t.importJsonTitle}
              >
                <Upload className="w-4 h-4 text-indigo-500" />
                <span>{t.importJson}</span>
              </button>
              <button
                type="button"
                onClick={onExportData}
                className="flex-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition text-xs font-bold shadow-sm dark:shadow-none cursor-pointer"
                title={t.exportJsonTitle}
              >
                <Download className="w-4 h-4 text-indigo-500" />
                <span>{t.exportJson}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
