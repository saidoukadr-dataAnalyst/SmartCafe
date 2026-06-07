import React, { useState } from 'react';
import { ShieldAlert, X, CheckCircle2 } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
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
      setError('Veuillez remplir tous les champs.');
      return;
    }

    // Verify current password
    const savedPassword = localStorage.getItem('app_password');
    if (currentPassword !== savedPassword) {
      setError('Le mot de passe actuel est incorrect.');
      return;
    }

    // Validate new password length
    if (newPassword.length < 4) {
      setError('Le nouveau mot de passe doit contenir au moins 4 caractères.');
      return;
    }

    // Verify match
    if (newPassword !== confirmPassword) {
      setError('Le nouveau mot de passe et sa confirmation ne correspondent pas.');
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Modifier le Mot de Passe</h3>
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
            <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>Mot de passe modifié avec succès !</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Ce modal va se fermer automatiquement...</p>
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
              <label className="form-label">Mot de passe actuel</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => { setError(''); setCurrentPassword(e.target.value); }}
                className="form-input"
                placeholder="Saisissez votre mot de passe actuel"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => { setError(''); setNewPassword(e.target.value); }}
                className="form-input"
                placeholder="Au moins 4 caractères"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirmez le nouveau mot de passe</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setError(''); setConfirmPassword(e.target.value); }}
                className="form-input"
                placeholder="Répétez le nouveau mot de passe"
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
                Annuler
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ flex: 1 }}
              >
                Enregistrer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChangePasswordModal;
