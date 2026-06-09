/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DB, LocalUser } from '../lib/db';
import { Mail, Lock, User, Sparkles, LogIn, ChevronRight, HelpCircle, ArrowLeft, AlertCircle } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (user: LocalUser) => void;
  onClose?: () => void;
  initialGuestMode?: boolean;
}

function cleanFirebaseError(err: any): string {
  if (!err) return 'An unexpected ledger error occurred.';
  const errStr = typeof err === 'string' ? err : (err.message || err.code || String(err));
  const lowerErr = errStr.toLowerCase();

  if (lowerErr.includes('password-does-not-meet-requirements') || 
      lowerErr.includes('password-not-meeting-requirements') || 
      lowerErr.includes('weak-password')) {
    return 'The password does not comply with our security policies. The password should contain all of these elements: lowercase letters, uppercase letters, numbers, and at least eight characters.';
  }
  if (lowerErr.includes('invalid-credential') || lowerErr.includes('wrong-password') || lowerErr.includes('user-not-found')) {
    return 'The credentials entered do not match our postal registry. Please double check your email and password.';
  }
  if (lowerErr.includes('email-already-in-use')) {
    return 'This email address is already registered in our ledgers. Please sign in instead of establishing a new duplicate account.';
  }
  if (lowerErr.includes('invalid-email')) {
    return 'The provided email address format is invalid. Please check your spelling and try again.';
  }
  if (lowerErr.includes('too-many-requests')) {
    return 'Too many consecutive attempts. Access has been temporarily suspended to secure your parcel box. Please try again in a few minutes.';
  }
  if (lowerErr.includes('user-disabled')) {
    return 'This ledger account has been suspended or deactivated in our records.';
  }
  if (lowerErr.includes('popup-closed-by-user')) {
    return 'The authentication window was closed before securing your signature. Please try again.';
  }
  if (lowerErr.includes('operation-not-allowed')) {
    return "Email & Password sign-in is not yet enabled in your Firebase project. Please enable it in the Firebase Console under Authentication.";
  }

  // Scan and clean up standard Firebase formatting
  if (errStr.includes('Firebase:') || errStr.includes('auth/')) {
    return 'An entry verification check failed. Please review your email and password constraints.';
  }

  return errStr;
}

export default function AuthScreen({ onAuthSuccess, onClose, initialGuestMode = false }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<'registered' | 'guest'>(initialGuestMode ? 'guest' : 'registered');
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string; bullets?: string[] } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isReset) {
        await DB.resetPassword(email);
        setMessage({ text: 'A custom parchment restorer token was sent to your inbox.', type: 'success' });
      } else if (isLogin) {
        const user = await DB.signInWithEmail(email, password);
        onAuthSuccess(user);
      } else {
        if (!displayName.trim()) {
          throw new Error('Please enter your esteemed name for the postal ledger.');
        }

        // Run explicit client-side check for password policies
        const passwordTrimmed = password;
        const hasLower = /[a-z]/.test(passwordTrimmed);
        const hasUpper = /[A-Z]/.test(passwordTrimmed);
        const hasNumber = /[0-9]/.test(passwordTrimmed);
        const hasMinLen = passwordTrimmed.length >= 8;

        if (!hasLower || !hasUpper || !hasNumber || !hasMinLen) {
          setErrorModal({
            title: 'Registry Policy Infraction',
            message: 'Your chosen seal phrase (password) is non-compliant. The password should contain all of these elements:',
            bullets: [
              'Uppercase letters',
              'Lowercase letters',
              'Numbers',
              'At least eight characters'
            ]
          });
          setLoading(false);
          return;
        }

        const user = await DB.signUpWithEmail(email, password, displayName);
        onAuthSuccess(user);
      }
    } catch (err) {
      const errStr = err instanceof Error ? err.stack || err.message : String(err);
      const lowerErr = errStr.toLowerCase();
      
      let title = 'Registry Seal Blocked';
      let cleanMsg = '';
      let bullets: string[] | undefined = undefined;

      if (lowerErr.includes('verification_email_sent')) {
        title = 'Verification Scroll En Route';
        cleanMsg = 'Your registration was successful! We have dispatched an identity verification scroll to your inbox. Please open the verification link inside before returning to sign in.';
      } else if (lowerErr.includes('email_not_verified')) {
        title = 'Ledger Verification Required';
        cleanMsg = 'Your email address has not been verified yet. For security, we have dispatched a fresh verification link to your inbox. Please check your spam folder and verify your ownership first, then log in again!';
      } else if (lowerErr.includes('user_not_found_in_db')) {
        title = 'Registry Record Absent';
        cleanMsg = 'This email address was not found in our correspondence ledgers. Please create a new account to begin your correspondence journey.';
      } else if (lowerErr.includes('password-does-not-meet-requirements') || 
          lowerErr.includes('password-not-meeting-requirements') || 
          lowerErr.includes('weak-password')) {
        title = 'Registry Policy Infraction';
        cleanMsg = 'Your chosen seal phrase (password) is non-compliant. The password should contain all of these elements:';
        bullets = [
          'Uppercase letters',
          'Lowercase letters',
          'Numbers',
          'At least eight characters'
        ];
      } else if (lowerErr.includes('invalid-credential') || lowerErr.includes('wrong-password') || lowerErr.includes('user-not-found')) {
        title = 'Identity Verification Failed';
        cleanMsg = 'The credentials entered do not match our postal registry. Please double check your email and password.';
      } else if (lowerErr.includes('email-already-in-use')) {
        title = 'Ledger Signature Duplicate';
        cleanMsg = 'This email address is already registered in our ledgers. Please sign in instead of establishing a new duplicate account.';
      } else if (lowerErr.includes('invalid-email')) {
        title = 'Invalid Dispatch Address';
        cleanMsg = 'The format of the email address entered is incorrect. Please check your spelling.';
      } else if (lowerErr.includes('too-many-requests')) {
        title = 'Registry Locked Temporarily';
        cleanMsg = 'For security reasons, your account sign-in is temporarily suspended due to multiple consecutive failed attempts. Please try again shortly.';
      } else if (lowerErr.includes('user-disabled')) {
        title = 'Ledger Deactivated';
        cleanMsg = 'This ledger account has been suspended or deactivated in our records.';
      } else {
        title = 'Postal Registry Error';
        cleanMsg = cleanFirebaseError(err);
      }

      setErrorModal({ title, message: cleanMsg, bullets });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const user = await DB.signInWithGoogle();
      onAuthSuccess(user);
    } catch (err) {
      const errStr = err instanceof Error ? err.message : String(err);
      let cleanMsg = 'A connection error occurred while signing in with Google. Please try again.';
      if (errStr.includes('popup-closed-by-user')) {
        cleanMsg = 'The Google authentication window was closed before securing your signature. Please try again.';
      }
      setErrorModal({
        title: 'Google Entry Halted',
        message: cleanMsg
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const name = guestName.trim() || 'Guest';
      const user = await DB.enterGuestMode(name);
      onAuthSuccess(user);
    } catch (err) {
      setErrorModal({
        title: 'Guest Registry Failed',
        message: 'Could not establish guest access at this time. Please check your internet connection or try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen-container" className="max-w-md w-full bg-[#EAD7B7] border-4 border-[#7A4E2D] rounded-2xl shadow-2xl p-6 md:p-8 relative overflow-hidden select-none">
      {/* Decorative Stamp corners */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#7A4E2D]/40 rounded-tl-lg m-2 pointer-events-none" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#7A4E2D]/40 rounded-tr-lg m-2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#7A4E2D]/40 rounded-bl-lg m-2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#7A4E2D]/40 rounded-br-lg m-2 pointer-events-none" />

      {/* Retro post office header */}
      <div className="text-center mb-6">
        <h2 className="font-serif text-3xl font-bold tracking-tight text-[#2E1E12] flex items-center justify-center gap-2">
          <span>THE LETTERS</span>
        </h2>
        <p className="text-xs font-mono tracking-widest text-[#7A4E2D] uppercase mt-1">
          Est. 2026 • Postal Ledger
        </p>
        <div className="h-[2px] w-1/3 bg-[#7A4E2D]/20 mx-auto mt-3" />
      </div>

      {message && (
        <div
          id="auth-msg-banner"
          className={`px-4 py-2.5 rounded-lg text-xs font-mono mb-4 text-center border ${
            message.type === 'success'
              ? 'bg-[#4F772D]/10 border-[#4F772D] text-[#2C3E20]'
              : 'bg-[#8B0000]/10 border-[#8B0000] text-[#8B0000]'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Options tabs: Registered Mail vs Guest Ledger */}
      {!isReset && (
        <div className="flex bg-[#7A4E2D]/10 p-1 rounded-xl mb-6 border border-[#a67c52]/25">
          <button
            id="tab-reg-mail"
            onClick={() => {
              setActiveTab('registered');
            }}
            className={`flex-1 text-center py-2 text-xs font-mono rounded-lg transition-all ${
              activeTab === 'registered' 
                ? 'bg-[#7A4E2D] text-[#F4E9D8] shadow-md font-semibold' 
                : 'text-[#7A4E2D] hover:bg-[#7A4E2D]/5'
            }`}
          >
            Registered Mail
          </button>
          <button
            id="tab-guest-parchment"
            onClick={() => {
              setActiveTab('guest');
            }}
            className={`flex-1 text-center py-2 text-xs font-mono rounded-lg transition-all ${
              activeTab === 'guest' 
                ? 'bg-[#7A4E2D] text-[#F4E9D8] shadow-md font-semibold' 
                : 'text-[#7A4E2D] hover:bg-[#7A4E2D]/5'
            }`}
          >
            Guest Ledger
          </button>
        </div>
      )}

      {activeTab === 'guest' && !isReset ? (
        /* GUEST MODE VIEW */
        <form id="auth-guest-form" onSubmit={handleGuestSubmit} className="space-y-4">
          
          <div>
            <label className="block text-[10px] font-mono uppercase text-[#7A4E2D] tracking-wider mb-1.5 font-bold">
              Who is the author?
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-[#7A4E2D]/60" />
              <input
                id="guest-name-input"
                type="text"
                placeholder="e.g. Anna"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full bg-[#F4E9D8] pl-10 pr-4 py-2 text-xs font-serif text-[#2E1E12] border-2 border-[#7A4E2D]/40 rounded-xl focus:border-[#7A4E2D] outline-none"
              />
            </div>
          </div>
          <button
            id="guest-launch-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-[#7A4E2D] hover:bg-[#5E3B21] text-[#F4E9D8] hover:text-white py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest font-semibold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
          >
            <Sparkles className="w-4 h-4" /> Enter
          </button>
          
          <div className="text-center pt-2">
            <button
              id="goto-signin-btn"
              type="button"
              onClick={() => {
                setActiveTab('registered');
                setIsLogin(false);
              }}
              className="text-[10px] font-mono text-[#8B0000] underline"
            >
              Or Sign up with email 
            </button>
          </div>
        </form>
      ) : (
        /* EMAIL SIGN IN / SIGN UP FORM */
        <form id="auth-main-form" onSubmit={handleAuth} className="space-y-4">
          {isReset ? (
            /* Reset password */
            <div className="space-y-4">
              <button
                id="reset-back-btn"
                type="button"
                onClick={() => setIsReset(false)}
                className="flex items-center gap-1 text-[10px] font-mono text-[#7A4E2D] hover:underline"
              >
                <ArrowLeft className="w-3 h-3" /> Back to registry entrance
              </button>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#7A4E2D] tracking-wider mb-1">
                  Parchment owner email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#7A4E2D]/60" />
                  <input
                    id="reset-email-input"
                    type="email"
                    required
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#F4E9D8] pl-10 pr-4 py-2 text-xs font-mono text-[#2E1E12] border-2 border-[#7A4E2D]/40 rounded-xl focus:border-[#7A4E2D] outline-none"
                  />
                </div>
              </div>
              <button
                id="reset-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full bg-[#8B0000] hover:bg-[#680000] text-white py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest font-semibold flex items-center justify-center shadow"
              >
                Restore Key
              </button>
            </div>
          ) : (
            /* Normal Sign-in / Sign-up */
            <div className="space-y-3.5">
              {!isLogin && (
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#7A4E2D] tracking-wider mb-1">
                    Your Full Name (or pen name)
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-[#7A4E2D]/60" />
                    <input
                      id="reg-name-input"
                      type="text"
                      placeholder="e.g. Victor Hugo"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-[#F4E9D8] pl-10 pr-4 py-2 text-xs font-serif text-[#2E1E12] border-2 border-[#7A4E2D]/40 rounded-xl focus:border-[#7A4E2D] outline-none"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#7A4E2D] tracking-wider mb-1">
                  Ledger Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#7A4E2D]/60" />
                  <input
                    id="reg-email-input"
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#F4E9D8] pl-10 pr-4 py-2 text-xs font-mono text-[#2E1E12] border-2 border-[#7A4E2D]/40 rounded-xl focus:border-[#7A4E2D] outline-none"
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-mono uppercase text-[#7A4E2D] tracking-wider">
                    Password
                  </label>
                  {isLogin && (
                    <button
                      id="forgot-phrase-btn"
                      type="button"
                      onClick={() => setIsReset(true)}
                      className="text-[9px] font-mono text-[#8B0000] hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#7A4E2D]/60" />
                  <input
                    id="reg-pass-input"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#F4E9D8] pl-10 pr-4 py-2 text-xs font-mono text-[#2E1E12] border-2 border-[#7A4E2D]/40 rounded-xl focus:border-[#7A4E2D] outline-none"
                  />
                </div>
                <div id="password-requirements-caption" className="mt-1.5 text-[10px] font-mono text-[#7A4E2D] leading-relaxed">
                  <p className="font-semibold text-[#8B0000] mt-1.5 mb-1 flex items-center gap-1 select-none">
                    <AlertCircle className="w-3.5 h-3.5" /> Seal requirements include:
                  </p>
                  <ul className="list-disc pl-5 mt-0.5 space-y-0.5 text-[#2E1E12]/85 font-medium select-none">
                    
                    <li>Lowercase and uppercase letters </li>
                    <li>Numbers</li>
                    <li>At least eight characters</li>
                  </ul>
                </div>
              </div>

              <button
                id="auth-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full bg-[#7A4E2D] hover:bg-[#5E3B21] text-[#F4E9D8] hover:text-white py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest font-semibold flex items-center justify-center gap-1.5 shadow active:scale-95 transition"
              >
                {loading ? 'Consulting registry...' : isLogin ? 'Sign In' : 'Establish Account (Sign Up)'}
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="relative my-4 text-center">
                <span className="bg-[#EAD7B7] px-2 text-[10px] font-mono text-[#7A4E2D]/60 relative z-10">OR</span>
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#7A4E2D]/20 z-0" />
              </div>

              {/* Google Fast Login */}
              <button
                id="g-login-btn"
                type="button"
                onClick={handleGoogleLogin}
                className="w-full bg-[#F4E9D8] hover:bg-[#f6efe4] text-[#2E1E12] py-2.5 border-2 border-[#7A4E2D]/30 rounded-xl text-xs font-mono font-medium flex items-center justify-center gap-2 active:scale-95 transition shadow-sm"
              >
                <LogIn className="w-4 h-4 text-[#8b0000]" /> Sign in with Google Account
              </button>

              <div className="text-center pt-2">
                <button
                  id="auth-toggle-reg-btn"
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-[10px] font-mono text-[#7A4E2D] hover:underline"
                >
                  {isLogin ? "Don't have a ledger entry yet? Register now" : "Already registered your seal? Access here"}
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {onClose && (
        <button
          id="auth-close-btn"
          onClick={onClose}
          className="absolute top-2 right-2 p-1 text-[#7A4E2D]/50 hover:text-[#7A4E2D] transition text-[10px] font-mono"
        >
          ✕
        </button>
      )}

      {errorModal && (
        <div
          id="custom-error-popup-overlay"
          className="fixed inset-0 bg-[#2E1E12]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setErrorModal(null)}
        >
          <div
            id="custom-error-popup-card"
            className="max-w-sm w-full bg-[#F4E9D8] border-4 border-[#8B0000] rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 text-[#2E1E12]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decentered stamp corners */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#8B0000]/40 rounded-tl m-1.5 pointer-events-none" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#8B0000]/40 rounded-tr m-1.5 pointer-events-none" />
            
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-[#8B0000]/10 mb-4 border-2 border-[#8B0000]/30 text-[#8B0000]">
                <AlertCircle className="h-6 w-6" />
              </div>
              
              <h3 id="custom-error-popup-title" className="font-serif text-base font-bold tracking-tight text-[#8B0000] mb-2 uppercase">
                {errorModal.title}
              </h3>
              
              <p id="custom-error-popup-message" className="text-xs font-serif leading-relaxed text-[#2D1F16]/90 mb-4 px-1">
                {errorModal.message}
              </p>

              {errorModal.bullets && errorModal.bullets.length > 0 && (
                <ul id="custom-error-popup-bullets" className="text-left text-xs font-mono bg-[#7A4E2D]/5 p-3 rounded-xl border border-[#7A4E2D]/15 mb-5 space-y-1 text-[#2E1E12]/90 max-w-xs mx-auto list-disc pl-6 select-none">
                  {errorModal.bullets.map((b, idx) => (
                    <li key={idx} className="font-medium">{b}</li>
                  ))}
                </ul>
              )}
              
              <button
                id="custom-error-popup-close"
                type="button"
                onClick={() => setErrorModal(null)}
                className="w-full bg-[#8B0000] hover:bg-[#680000] text-[#F4E9D8] hover:text-white py-2 rounded-xl text-xs font-mono uppercase tracking-widest font-bold shadow transition active:scale-95"
              >
                Acknowledge Seal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
