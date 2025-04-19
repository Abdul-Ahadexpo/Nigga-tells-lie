import React from 'react';
import { Room } from '../types';

type Props = {
  room: Room;
  targetPlayer: string;
  onVote: () => void;
  onClose: () => void;
  currentVotes: number;
  requiredVotes: number;
};

export function KickVoteModal({ room, targetPlayer, onVote, onClose, currentVotes, requiredVotes }: Props) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-card-foreground">Vote to Kick Player</h2>
        <p className="mb-4 text-card-foreground">
          Do you want to vote to kick <span className="font-bold">{targetPlayer}</span>?
        </p>
        <p className="mb-4 text-sm text-muted-foreground">
          Current votes: {currentVotes} / {requiredVotes} required
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
          >
            Cancel
          </button>
          <button
            onClick={onVote}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
          >
            Vote to Kick
          </button>
        </div>
      </div>
    </div>
  );
}