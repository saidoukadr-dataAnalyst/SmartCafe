import React, { useState } from 'react';
import { ShieldAlert, Key, Copy, Check } from 'lucide-react';

interface ActivationScreenProps {
  onActivationSuccess: () => void;
}

const ActivationScreen: React.FC<ActivationScreenProps> = ({ onActivationSuccess }) => {
  const [deviceId] = useState(() => {
    let id = localStorage.getItem('app_device_id');
    if (!id) {
      // Generate a professional-looking HW ID
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
      const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      id = `HW-${part()}-${part()}-${part()}`;
      localStorage.setItem('app_device_id', id);
    }
    return id;
  });
  const [activationKey, setActivationKey] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validateKey = (devId: string, enteredKey: string): boolean => {
    const salt = "SmartCafe2026ActivationSaltKey!";
    const combined = devId + salt;
    // Polynomial rolling hash (FNV-1a style)
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash * 31 + combined.charCodeAt(i)) >>> 0;
    }
    const hex = hash.toString(16).toUpperCase().padStart(8, '0');
    const expectedKey = `KEY-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
    return enteredKey.trim().toUpperCase() === expectedKey;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!activationKey.trim()) {
      setError("Veuillez saisir une clé d'activation.");
      return;
    }

    if (validateKey(deviceId, activationKey)) {
      setSuccess(true);
      localStorage.setItem('app_activated', 'true');
      setTimeout(() => {
        onActivationSuccess();
      }, 1500);
    } else {
      setError("Clé d'activation invalide. Veuillez contacter le vendeur.");
    }
  };

  return (
    <div className="activation-container">
      <div className="activation-card">
        <div className="activation-icon-container">
          <ShieldAlert size={36} />
        </div>
        
        <h1 className="activation-title">Activation de la Licence</h1>
        <p className="activation-subtitle">
          Cette application nécessite une clé d'activation unique pour cet appareil pour fonctionner.
        </p>

        {error && (
          <div className="activation-error">
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="activation-success-alert">
            <Check size={24} />
            <span>Licence activée avec succès ! Chargement...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="activation-form">
            <div className="device-id-box">
              <span className="device-id-label">Identifiant de votre Appareil :</span>
              <div className="device-id-display">
                <code>{deviceId}</code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="copy-id-btn"
                  title="Copier l'identifiant"
                >
                  {copied ? <Check size={18} style={{ color: 'var(--success)' }} /> : <Copy size={18} />}
                  <span>{copied ? "Copié !" : "Copier"}</span>
                </button>
              </div>
            </div>

            <div className="form-group" style={{ textAlign: 'left', marginTop: '1.5rem' }}>
              <label className="form-label">Saisir la Clé d'Activation</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Key size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  value={activationKey}
                  onChange={(e) => { setError(''); setActivationKey(e.target.value); }}
                  placeholder="KEY-XXXX-XXXX"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary activation-submit-btn">
              Activer l'Application
            </button>

            <p className="activation-footer-text">
              Veuillez transmettre l'Identifiant de votre Appareil ci-dessus à votre vendeur pour recevoir votre clé d'activation.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ActivationScreen;
