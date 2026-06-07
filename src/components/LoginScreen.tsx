import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Coffee, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSetupMode, setIsSetupMode] = useState(false);

  useEffect(() => {
    const savedPassword = localStorage.getItem('app_password');
    if (savedPassword) {
      setIsSetupMode(false);
    } else {
      setIsSetupMode(true);
    }
  }, []);

  const handleKeyPress = (num: string) => {
    setError('');
    if (isSetupMode) {
      if (confirmPassword !== '') {
        setConfirmPassword(prev => prev + num);
      } else {
        setPassword(prev => prev + num);
      }
    } else {
      setPassword(prev => prev + num);
    }
  };

  const handleClear = () => {
    setError('');
    if (isSetupMode) {
      if (confirmPassword !== '') {
        setConfirmPassword('');
      } else {
        setPassword('');
      }
    } else {
      setPassword('');
    }
  };

  const handleValidate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (isSetupMode) {
      if (password.length < 4) {
        setError('Le mot de passe doit contenir au moins 4 caractères.');
        return;
      }
      if (confirmPassword === '') {
        // Move to confirm stage
        if (password) {
          setError('Veuillez confirmer le mot de passe.');
        } else {
          setError('Veuillez saisir un mot de passe.');
        }
        return;
      }
      if (password !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas. Recommencez.');
        setPassword('');
        setConfirmPassword('');
        return;
      }
      // Save password
      localStorage.setItem('app_password', password);
      sessionStorage.setItem('app_authenticated', 'true');
      onLoginSuccess();
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

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo-container">
          <div className="login-logo-icon">
            <Coffee size={32} />
          </div>
          <h1 className="login-brand">SmartCafe</h1>
        </div>

        <h2 className="login-title">
          {isSetupMode 
            ? "Configuration de Sécurité" 
            : "Application Verrouillée"}
        </h2>
        <p className="login-subtitle">
          {isSetupMode 
            ? "Définissez un mot de passe pour protéger vos données." 
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
              value={isSetupMode && password && confirmPassword === '' ? password : (isSetupMode ? confirmPassword : password)}
              onChange={(e) => {
                setError('');
                if (isSetupMode) {
                  if (confirmPassword !== '' || password.length >= 4) {
                    setConfirmPassword(e.target.value);
                  } else {
                    setPassword(e.target.value);
                  }
                } else {
                  setPassword(e.target.value);
                }
              }}
              placeholder={
                isSetupMode 
                  ? (password === '' || confirmPassword === '' && password.length < 4 ? "Nouveau mot de passe" : "Confirmez le mot de passe")
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
              ? (confirmPassword !== '' ? "Enregistrer & Se Connecter" : "Continuer") 
              : "Se Connecter"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
