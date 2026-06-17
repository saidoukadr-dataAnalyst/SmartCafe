import React, { useState } from 'react';
import { ShieldAlert, X, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Basic Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t('security.errorFillFields'));
      return;
    }

    // Verify current password
    const savedPassword = localStorage.getItem('app_password');
    if (currentPassword !== savedPassword) {
      setError(t('security.errorIncorrectCurrent'));
      return;
    }

    // Validate new password length
    if (newPassword.length < 4) {
      setError(t('security.errorMinLength'));
      return;
    }

    // Verify match
    if (newPassword !== confirmPassword) {
      setError(t('security.errorMismatch'));
      return;
    }

    // Save and succeed
    localStorage.setItem('app_password', newPassword);
    setSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    // Auto-close modal after 2 seconds
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '450px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldAlert size={24} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{t('security.title')}</h3>
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
            padding: '2rem 1rem', 
            textAlign: 'center',
            gap: '1rem'
          }}>
            <CheckCircle2 size={48} style={{ color: 'var(--success)' }} />
            <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{t('security.successMessage')}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t('security.autoCloseMessage')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                color: 'var(--danger)', 
                padding: '0.75rem 1rem', 
                borderRadius: 'var(--radius-md)', 
                marginBottom: '1rem',
                fontSize: '0.875rem',
                fontWeight: 500
              }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">{t('security.currentPassword')}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => { setError(''); setCurrentPassword(e.target.value); }}
                className="form-input"
                placeholder={t('security.currentPasswordPlaceholder')}
                required
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
                required
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
                required
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
        )}
      </div>
    </div>
  );
};

export default ChangePasswordModal;
