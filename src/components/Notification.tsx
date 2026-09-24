import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface NotificationState {
  msg: string;
  type: 'success' | 'error';
}

interface NotificationProps {
  notification: NotificationState | null;
}

export default function Notification({ notification }: NotificationProps) {
  if (!notification) return null;

  return (
    <div
      className={`fixed-toast ${
        notification.type === 'success' ? 'toast-success' : 'toast-error'
      }`}
    >
      <div className="flex items-center gap-2">
        {notification.type === 'success' ? (
          <CheckCircle2 size={20} />
        ) : (
          <AlertCircle size={20} />
        )}
        <p className="font-semibold text-base">{notification.msg}</p>
      </div>
    </div>
  );
}
