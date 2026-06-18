import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Coffee, AlertCircle, Key, Copy, Check } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSetupMode, setIsSetupMode] = useState(() => !localStorage.getItem('app_password'));
  const [isConfirming, setIsConfirming] = useState(false);

  // Recovery states
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [deviceId] = useState(() => {
    let id = localStorage.getItem('app_device_id');
    if (!id) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      id = `HW-${part()}-${part()}-${part()}`;
      localStorage.setItem('app_device_id', id);
    }
    return id;
  });
  const [copied, setCopied] = useState(false);

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyPress = (num: string) => {
    setError('');
    if (isSetupMode && isConfirming) {
      setConfirmPassword(prev => prev + num);
    } else {
      setPassword(prev => prev + num);
    }
  };

  const handleClear = () => {
    setError('');
    if (isSetupMode && isConfirming) {
      setConfirmPassword('');
    } else {
      setPassword('');
    }
  };

  const validateRecoveryKey = (devId: string, enteredKey: string): boolean => {
    const salt = "SmartCafe2026MasterRecoverySaltKey!";
    const combined = devId + salt;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash * 31 + combined.charCodeAt(i)) >>> 0;
    }
    const hex = hash.toString(16).toUpperCase().padStart(8, '0');
    const expectedKey = `REC-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
    return enteredKey.trim().toUpperCase() === expectedKey;
  };

  const handleValidate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (isRecovering) {
      if (!recoveryKey.trim()) {
        setError("Veuillez saisir un code de récupération.");
        return;
      }
      if (validateRecoveryKey(deviceId, recoveryKey)) {
        localStorage.removeItem('app_password');
        setIsSetupMode(true);
        setIsConfirming(false);
        setIsRecovering(false);
        setPassword('');
        setConfirmPassword('');
        setRecoveryKey('');
      } else {
        setError("Code de récupération invalide. Veuillez contacter le vendeur.");
      }
      return;
    }

    if (isSetupMode) {
      if (!isConfirming) {
        if (password.length < 4) {
          setError('Le mot de passe doit contenir au moins 4 caractères.');
          return;
        }
        setIsConfirming(true);
      } else {
        if (password !== confirmPassword) {
          setError('Les mots de passe ne correspondent pas. Veuillez recommencer.');
          setPassword('');
          setConfirmPassword('');
          setIsConfirming(false);
          return;
        }
        // Save password
        localStorage.setItem('app_password', password);
        sessionStorage.setItem('app_authenticated', 'true');
        onLoginSuccess();
      }
    } else {
      const savedPassword = localStorage.getItem('app_password');
      if (password === savedPassword) {
        sessionStorage.setItem('app_authenticated', 'true');
        onLoginSuccess();
      } else {
        setError('Mot de passe incorrect.');
        setPassword('');
      }
    }
  };

  const [cafeName] = useState(() => localStorage.getItem('app_cafe_name') || 'SmartCafe');

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo-container">
          <div className="login-logo-icon">
            <Coffee size={32} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 className="login-brand" style={{ marginBottom: '0.2rem' }}>{cafeName}</h1>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.5px', opacity: 0.8 }}>by Oukadr</span>
          </div>
        </div>

        {isRecovering ? (
          <>
            <h2 className="login-title">Réinitialisation du Code PIN</h2>
            <p className="login-subtitle">
              Saisissez le code de récupération fourni par votre vendeur pour définir un nouveau code PIN.
            </p>

            {error && (
              <div className="login-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleValidate} className="login-form">
              <div className="device-id-box" style={{ marginBottom: '1.25rem' }}>
                <span className="device-id-label">Identifiant de votre Appareil :</span>
                <div className="device-id-display">
                  <code>{deviceId}</code>
                  <button
                    type="button"
                    onClick={handleCopyDeviceId}
                    className="copy-id-btn"
                    title="Copier l'identifiant"
                  >
                    {copied ? <Check size={18} style={{ color: 'var(--success)' }} /> : <Copy size={18} />}
                    <span>{copied ? "Copié !" : "Copier"}</span>
                  </button>
                </div>
              </div>

              <div className="login-input-wrapper">
                <Key size={20} className="login-input-icon" />
                <input
                  type="text"
                  value={recoveryKey}
                  onChange={(e) => {
                    setError('');
                    setRecoveryKey(e.target.value);
                  }}
                  placeholder="REC-XXXX-XXXX"
                  className="login-input"
                  style={{ paddingLeft: '2.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsRecovering(false);
                    setError('');
                    setRecoveryKey('');
                  }}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Réinitialiser
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h2 className="login-title">
              {isSetupMode 
                ? (isConfirming ? "Confirmation du code" : "Configuration de Sécurité") 
                : "Application Verrouillée"}
            </h2>
            <p className="login-subtitle">
              {isSetupMode 
                ? (isConfirming ? "Saisissez à nouveau le code pour confirmer." : "Définissez un mot de passe pour protéger vos données.") 
                : "Veuillez saisir votre mot de passe pour accéder au tableau de bord."}
            </p>

            {error && (
              <div className="login-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleValidate} className="login-form">
              <div className="login-input-wrapper">
                <Lock size={20} className="login-input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={isConfirming ? confirmPassword : password}
                  onChange={(e) => {
                    setError('');
                    if (isConfirming) {
                      setConfirmPassword(e.target.value);
                    } else {
                      setPassword(e.target.value);
                    }
                  }}
                  placeholder={
                    isSetupMode 
                      ? (isConfirming ? "Confirmez le mot de passe" : "Nouveau mot de passe")
                      : "Mot de passe"
                  }
                  className="login-input"
                  autoFocus
                  maxLength={12}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-input-toggle"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Touch-Friendly PIN Pad */}
              <div className="pin-pad">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className="pin-btn"
                    onClick={() => handleKeyPress(num)}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  className="pin-btn clear-btn"
                  onClick={handleClear}
                  title="Effacer"
                >
                  Effacer
                </button>
                <button
                  type="button"
                  className="pin-btn"
                  onClick={() => handleKeyPress('0')}
                >
                  0
                </button>
                <button
                  type="submit"
                  className="pin-btn validate-btn"
                  title="Valider"
                >
                  OK
                </button>
              </div>

              <button type="submit" className="btn btn-primary login-submit-btn">
                {isSetupMode 
                  ? (isConfirming ? "Enregistrer & Se Connecter" : "Continuer") 
                  : "Se Connecter"}
              </button>

              {!isSetupMode && (
                <button
                  type="button"
                  onClick={() => {
                    setIsRecovering(true);
                    setError('');
                    setPassword('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    marginTop: '1rem',
                    textDecoration: 'underline'
                  }}
                >
                  Code PIN oublié ?
                </button>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;
