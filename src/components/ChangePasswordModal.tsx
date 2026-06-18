import React, { useState, useRef } from 'react';
import { ShieldAlert, X, CheckCircle2, Lock, Database, Download, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'pin' | 'backup'>('pin');
  
  // PIN & Café change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cafeName, setCafeName] = useState(() => localStorage.getItem('app_cafe_name') || 'SmartCafe');
  
  // General UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    let pinChanged = false;
    // Validate password fields ONLY if at least one is filled
    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setError(t('security.errorFillFields'));
        return;
      }

      const savedPassword = localStorage.getItem('app_password');
      if (currentPassword !== savedPassword) {
        setError(t('security.errorIncorrectCurrent'));
        return;
      }

      if (newPassword.length < 4) {
        setError(t('security.errorMinLength'));
        return;
      }

      if (newPassword !== confirmPassword) {
        setError(t('security.errorMismatch'));
        return;
      }

      localStorage.setItem('app_password', newPassword);
      pinChanged = true;
    }

    // Save Café name if changed
    const oldCafeName = localStorage.getItem('app_cafe_name') || 'SmartCafe';
    let cafeNameChanged = false;
    if (cafeName.trim() && cafeName.trim() !== oldCafeName) {
      localStorage.setItem('app_cafe_name', cafeName.trim());
      cafeNameChanged = true;
    }

    // Success messaging
    if (pinChanged && cafeNameChanged) {
      setSuccessMessage(t('security.successMessage') + " & Nom mis à jour");
    } else if (pinChanged) {
      setSuccessMessage(t('security.successMessage'));
    } else if (cafeNameChanged) {
      setSuccessMessage("Nom du Café enregistré avec succès !");
    } else {
      onClose();
      return;
    }

    setSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    setTimeout(() => {
      setSuccess(false);
      onClose();
      window.location.reload();
    }, 1500);
  };

  const handleBackup = async () => {
    try {
      setError('');
      const keysToBackup = [
        'app_suppliers',
        'app_deliveries',
        'app_deliveries_archive',
        'app_staff',
        'app_payroll',
        'app_incomes',
        'app_fixed_expenses',
        'app_trash',
        'app_password',
        'app_lang',
        'theme'
      ];
      
      const backupData: Record<string, string | null> = {};
      keysToBackup.forEach(key => {
        backupData[key] = localStorage.getItem(key);
      });
      
      const backupString = JSON.stringify({
        app: 'SmartCafe',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        data: backupData
      }, null, 2);
      
      const filename = `SmartCafe_Backup_${new Date().toISOString().split('T')[0]}.json`;
      
      if (Capacitor.isNativePlatform()) {
        const base64Data = btoa(unescape(encodeURIComponent(backupString)));
        const writeResult = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache
        });
        
        await Share.share({
          title: 'Sauvegarde SmartCafe',
          text: `Fichier de sauvegarde des données : ${filename}`,
          url: writeResult.uri,
          dialogTitle: 'Partager le fichier de sauvegarde'
        });
      } else {
        const blob = new Blob([backupString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde :', err);
      setError('Une erreur est survenue lors de l\'exportation du fichier.');
    }
  };

  const handleRestoreClick = () => {
    setError('');
    fileInputRef.current?.click();
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (parsed.app !== 'SmartCafe' || !parsed.data) {
          setError(t('dataManagement.restoreError'));
          return;
        }
        
        if (window.confirm(t('dataManagement.confirmRestore'))) {
          const data = parsed.data;
          Object.keys(data).forEach(key => {
            const val = data[key];
            if (val !== null) {
              localStorage.setItem(key, val);
            } else {
              localStorage.removeItem(key);
            }
          });
          
          setSuccessMessage(t('dataManagement.restoreSuccess'));
          setSuccess(true);
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } catch (err) {
        console.error('Erreur lors de la restauration :', err);
        setError(t('dataManagement.restoreError'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTabChange = (tab: 'pin' | 'backup') => {
    setError('');
    setSuccess(false);
    setActiveTab(tab);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldAlert size={24} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{t('sidebar.security')}</h3>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '2.5rem 1rem', 
            textAlign: 'center',
            gap: '1rem'
          }}>
            <CheckCircle2 size={48} style={{ color: 'var(--success)' }} />
            <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{successMessage}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t('security.autoCloseMessage')}</p>
          </div>
        ) : (
          <div>
            {/* Tabs Bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', gap: '1rem' }}>
              <button 
                type="button"
                onClick={() => handleTabChange('pin')}
                style={{
                  padding: '0.5rem 0.25rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'pin' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: activeTab === 'pin' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'pin' ? 600 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Lock size={16} />
                <span>{t('security.pinTab') || 'PIN'}</span>
              </button>
              
              <button 
                type="button"
                onClick={() => handleTabChange('backup')}
                style={{
                  padding: '0.5rem 0.25rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'backup' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: activeTab === 'backup' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'backup' ? 600 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Database size={16} />
                <span>{t('dataManagement.title')}</span>
              </button>
            </div>

            {error && (
              <div style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                color: 'var(--danger)', 
                padding: '0.75rem 1rem', 
                borderRadius: 'var(--radius-md)', 
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
                fontWeight: 500
              }}>
                {error}
              </div>
            )}

            {activeTab === 'pin' ? (
              /* PIN Modification Tab */
              <form onSubmit={handlePinSubmit}>
                <div className="form-group">
                  <label className="form-label">{t('security.cafeName') || 'Nom du Café'}</label>
                  <input
                    type="text"
                    value={cafeName}
                    onChange={(e) => { setError(''); setCafeName(e.target.value); }}
                    className="form-input"
                    placeholder="Ex: Mon Café"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('security.currentPassword')}</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => { setError(''); setCurrentPassword(e.target.value); }}
                    className="form-input"
                    placeholder={t('security.currentPasswordPlaceholder')}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('security.newPassword')}</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setError(''); setNewPassword(e.target.value); }}
                    className="form-input"
                    placeholder={t('security.newPasswordPlaceholder')}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('security.confirmNewPassword')}</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setError(''); setConfirmPassword(e.target.value); }}
                    className="form-input"
                    placeholder={t('security.confirmNewPasswordPlaceholder')}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button 
                    type="button" 
                    onClick={onClose} 
                    className="btn btn-outline" 
                    style={{ flex: 1 }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ flex: 1 }}
                  >
                    {t('common.save')}
                  </button>
                </div>
              </form>
            ) : (
              /* Backup & Restore Tab */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Export section */}
                <div style={{ 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-lg)', 
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-secondary)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--accent-primary)' }}>
                      <Download size={20} />
                    </div>
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                        {t('dataManagement.backupBtn')}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {t('dataManagement.backupExplain')}
                      </p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleBackup} 
                    className="btn btn-primary" 
                    style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <Download size={16} />
                    <span>{t('dataManagement.backupBtn')}</span>
                  </button>
                </div>

                {/* Import section */}
                <div style={{ 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-lg)', 
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-secondary)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--success)' }}>
                      <Upload size={20} />
                    </div>
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                        {t('dataManagement.restoreBtn')}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {t('dataManagement.restoreExplain')}
                      </p>
                    </div>
                  </div>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleRestore} 
                    accept=".json" 
                    style={{ display: 'none' }} 
                  />
                  
                  <button 
                    type="button"
                    onClick={handleRestoreClick} 
                    className="btn btn-outline" 
                    style={{ 
                      width: '100%', 
                      justifyContent: 'center', 
                      gap: '0.5rem', 
                      borderColor: 'var(--success)', 
                      color: 'var(--success)' 
                    }}
                  >
                    <Upload size={16} />
                    <span>{t('dataManagement.restoreBtn')}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button 
                    type="button" 
                    onClick={onClose} 
                    className="btn btn-outline" 
                    style={{ width: '100%' }}
                  >
                    {t('suppliers.closeBtn')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChangePasswordModal;
