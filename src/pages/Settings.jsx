import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeProvider';
import SectionHeader from '@/components/SectionHeader';
import { AlertTriangle, LogOut, Trash2, User, Shield, AlertCircle, Moon, Sun } from 'lucide-react';

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [deleteStep, setDeleteStep] = useState(0); // 0=idle, 1=confirm, 2=final
  const [deleteInput, setDeleteInput] = useState('');

  // Only super admin and admin can access settings
  if (!['super_admin', 'admin'].includes(user?.role)) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-danger mx-auto mb-2" />
          <div className="text-foreground font-medium">Access Restricted</div>
          <div className="text-sm text-muted-foreground">Only administrators can access system settings</div>
        </div>
      </div>
    );
  }

  const handleDeleteAccount = () => {
    if (deleteInput.trim().toUpperCase() === 'DELETE') {
      // Account deletion request — in a real app call an API endpoint
      alert('Account deletion request submitted. You will receive a confirmation email within 24 hours.');
      setDeleteStep(0);
      setDeleteInput('');
      logout();
    }
  };

  return (
    <div className="p-6 space-y-6 pb-24 md:pb-6">
      <SectionHeader
        title="SETTINGS"
        subtitle="Account management and preferences"
        badge="Account"
      />

      {/* Account Info */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-medium text-foreground">{user?.full_name || 'User'}</div>
            <div className="text-sm text-muted-foreground">{user?.email || ''}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
          <Shield className="w-3.5 h-3.5" />
          <span>Role: <span className="text-primary capitalize">{user?.role || 'user'}</span></span>
        </div>
      </div>

      {/* Theme */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-bebas text-lg text-foreground mb-3">APPEARANCE</h3>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-secondary hover:bg-secondary/70 transition-colors text-foreground"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-warning" />
          ) : (
            <Moon className="w-4 h-4 text-primary" />
          )}
          <span className="text-sm font-medium">
            {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </span>
        </button>
      </div>

      {/* Sign Out */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-bebas text-lg text-foreground mb-3">SESSION</h3>
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-secondary hover:bg-secondary/70 transition-colors text-foreground"
        >
          <LogOut className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>

      {/* Delete Account */}
      <div className="bg-card border border-danger/30 rounded-lg p-5">
        <h3 className="font-bebas text-lg text-danger mb-1">DANGER ZONE</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {deleteStep === 0 && (
          <button
            onClick={() => setDeleteStep(1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-danger/40 text-danger text-sm font-medium hover:bg-danger/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        )}

        {deleteStep === 1 && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-danger/10 rounded-lg border border-danger/20">
              <AlertTriangle className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
              <p className="text-xs text-danger">
                This will permanently delete your account, all cattle lots, market data, and settings. This cannot be reversed.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Type <strong className="text-foreground">DELETE</strong> to confirm:</p>
            <input
              type="text"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="Type DELETE"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-danger/50 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteStep(0); setDeleteInput(''); }}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput.trim().toUpperCase() !== 'DELETE'}
                className="flex-1 px-4 py-2 rounded-lg bg-danger text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-danger/90 transition-colors"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-xs text-muted-foreground">
        Continental Cattle Co INC · 2026 Master System · v1.0
      </div>
    </div>
  );
}