export type User = {
  uid: string;
  email: string;
  username: string;
};

export type ChatMessage = {
  id: string;
  sender: string;
  message: string;
  timestamp: number;
};

export type Room = {
  id: string;
  name: string;
  players: string[];
  currentTurn: string;
  isPrivate: boolean;
  password?: string;
  owner: string;
  kickVotes: {
    [targetUid: string]: string[]; // Array of UIDs who voted to kick
  };
  currentChallenge?: {
    type: 'truth' | 'dare';
    question: string;
    from: string;
    to: string;
    completed: boolean;
    response?: string;
    reactions?: { [key: string]: string };
  };
  score?: { [key: string]: number };
  messages?: ChatMessage[];
};