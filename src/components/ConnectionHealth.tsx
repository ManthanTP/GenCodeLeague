import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionHealthProps {
  isConnected: boolean;
}

export default function ConnectionHealth({ isConnected }: ConnectionHealthProps) {
  return (
    <div
      className={`connection-health-pill ${
        isConnected ? 'conn-live' : 'conn-offline'
      }`}
    >
      {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
      {isConnected ? 'LIVE' : 'OFFLINE'}
    </div>
  );
}
