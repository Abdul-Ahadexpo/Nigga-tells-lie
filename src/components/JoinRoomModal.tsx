import React, { useState } from 'react';
import { Room } from '../types';

type Props = {
  room: Room;
  onJoin: (password?: string) => void;
  onClose: () => void;
};

export function JoinRoomModal({ room, onJoin, onClose }: Props) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onJoin(password);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-card-foreground">Join Room: {room.name}</h2>
        
        {room.isPrivate ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground">Room Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-input bg-background text-foreground shadow-sm focus:border-primary focus:ring focus:ring-primary/20"
                placeholder="Enter room password"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Join Room
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-card-foreground">This is a public room. No password required.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
              >
                Cancel
              </button>
              <button
                onClick={() => onJoin()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Join Room
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}