import { useAuth } from '@/lib/AuthContext';
import { Clock, CheckCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROLE_CONFIG } from '@/lib/roleConfig';

export default function PendingApprovalScreen() {
  const { user, logout } = useAuth();
  const roleLabel = ROLE_CONFIG[user?.role]?.label || user?.role;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <img
            src="https://media.base44.com/images/public/69f4e0f8f8f460e805a3eb84/d924dd25e_IMG_6891.png"
            alt="Continental Cattle Company"
            className="w-16 h-16 object-contain"
          />
          <div>
            <div className="font-bebas text-primary text-xl leading-tight tracking-wider">CONTINENTAL</div>
            <div className="text-muted-foreground text-sm">Cattle Co INC</div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-8 text-center shadow-lg">
          <div className="w-16 h-16 rounded-full bg-warning/10 border border-warning/30 flex items-center justify-center mx-auto mb-5">
            <Clock className="w-8 h-8 text-warning" />
          </div>

          <h1 className="font-bebas text-3xl text-foreground tracking-wide mb-2">
            ACCOUNT PENDING REVIEW
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Your account has been submitted for approval. Our team will review your
            registration and grant access based on your role.
          </p>

          {/* User info */}
          <div className="bg-secondary/50 rounded-lg p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{user?.full_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Role Requested</span>
              <span className="font-medium text-primary">{roleLabel}</span>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-8 text-left">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              <span>Account created successfully</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-4 h-4 rounded-full border-2 border-warning flex-shrink-0 animate-pulse" />
              <span className="text-warning">Awaiting admin approval</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="w-4 h-4 rounded-full border-2 border-border flex-shrink-0" />
              <span>Access granted to your portal</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-6">
            You'll receive an email notification once your account has been approved.
            This typically takes 1–2 business days.
          </p>

          <Button variant="outline" onClick={logout} className="w-full gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}