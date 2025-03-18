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
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Join Room: {room.name}</h2>
        
        {room.isPrivate ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Room Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                placeholder="Enter room password"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Join Room
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p>This is a public room. No password required.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => onJoin()}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
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