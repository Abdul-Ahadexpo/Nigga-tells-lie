import React, { useState, useEffect } from 'react';
import { ref, onValue, set, push } from 'firebase/database';
import { db } from './firebase';
import { Users, DoorOpen, Play, Check } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

type Room = {
  id: string;
  name: string;
  players: string[];
  currentTurn: string;
  currentChallenge?: {
    type: 'truth' | 'dare';
    question: string;
    from: string;
    to: string;
    completed: boolean;
  };
};

function App() {
  const [playerName, setPlayerName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [challenge, setChallenge] = useState('');

  useEffect(() => {
    const roomsRef = ref(db, 'rooms');
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomsList = Object.entries(data).map(([id, room]) => ({
          id,
          ...(room as any),
        }));
        setRooms(roomsList);
        
        if (currentRoom) {
          const updatedRoom = roomsList.find(r => r.id === currentRoom.id);
          setCurrentRoom(updatedRoom || null);
        }
      } else {
        setRooms([]);
      }
    });

    return () => {
      // Firebase will handle unsubscribe
    };
  }, [currentRoom]);

  const createRoom = async () => {
    if (!roomName || !playerName) {
      toast.error('Please enter both room name and your name');
      return;
    }

    const roomsRef = ref(db, 'rooms');
    const newRoomRef = push(roomsRef);
    const newRoom = {
      name: roomName,
      players: [playerName],
      currentTurn: playerName,
    };

    await set(newRoomRef, newRoom);
    setRoomName('');
    toast.success('Room created successfully!');
  };

  const joinRoom = async (room: Room) => {
    if (!playerName) {
      toast.error('Please enter your name first');
      return;
    }

    if (room.players.includes(playerName)) {
      toast.error('You are already in this room');
      return;
    }

    const updatedPlayers = [...room.players, playerName];
    await set(ref(db, `rooms/${room.id}`), {
      ...room,
      players: updatedPlayers,
    });
    setCurrentRoom(room);
    toast.success('Joined room successfully!');
  };

  const sendChallenge = async (type: 'truth' | 'dare') => {
    if (!currentRoom || !challenge) {
      toast.error('Please enter a challenge');
      return;
    }

    const currentPlayerIndex = currentRoom.players.indexOf(playerName);
    const nextPlayerIndex = (currentPlayerIndex + 1) % currentRoom.players.length;
    const nextPlayer = currentRoom.players[nextPlayerIndex];

    await set(ref(db, `rooms/${currentRoom.id}`), {
      ...currentRoom,
      currentTurn: nextPlayer,
      currentChallenge: {
        type,
        question: challenge,
        from: playerName,
        to: nextPlayer,
        completed: false,
      },
    });
    setChallenge('');
  };

  const markChallengeComplete = async () => {
    if (!currentRoom?.currentChallenge) return;

    await set(ref(db, `rooms/${currentRoom.id}`), {
      ...currentRoom,
      currentChallenge: {
        ...currentRoom.currentChallenge,
        completed: true,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-8">
      <Toaster position="top-right" />
      
      {!currentRoom ? (
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-xl p-6">
<h1 className="text-4xl font-extrabold text-gray-800 mb-4 flex items-center justify-center text-center">~ T & D ~</h1>
<p className="text-lg text-gray-600 flex items-center justify-center text-center">Play Truth and Dare with your nigga~</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                placeholder="Enter your name"
              />
            </div>

            <div className="border-t pt-4">
              <h2 className="text-xl font-semibold mb-4">Create New Room</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                  placeholder="Room name"
                />
                <button
                  onClick={createRoom}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
                >
                  <Users size={20} />
                  Create
                </button>
              </div>
            </div>

            <div className="border-t pt-4">
              <h2 className="text-xl font-semibold mb-4">Available Rooms</h2>
              <div className="space-y-2">
                {rooms.map((room) => (
                  <div key={room.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                    <div>
                      <p className="font-medium">{room.name}</p>
                      <p className="text-sm text-gray-500">{room.players.length} players</p>
                    </div>
                    <button
                      onClick={() => joinRoom(room)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                    >
                      <DoorOpen size={20} />
                      Join
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Room: {currentRoom.name}</h2>
            <button
              onClick={() => setCurrentRoom(null)}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Leave Room
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Players:</h3>
            <div className="flex gap-2 flex-wrap">
              {currentRoom.players.map((player) => (
                <span
                  key={player}
                  className={`px-3 py-1 rounded-full ${
                    player === currentRoom.currentTurn
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {player}
                </span>
              ))}
            </div>
          </div>

          {currentRoom.currentChallenge && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Current Challenge:</h3>
              <p>
                <span className="font-medium">From:</span> {currentRoom.currentChallenge.from}
              </p>
              <p>
                <span className="font-medium">To:</span> {currentRoom.currentChallenge.to}
              </p>
              <p>
                <span className="font-medium">Type:</span>{' '}
                <span className="capitalize">{currentRoom.currentChallenge.type}</span>
              </p>
              <p>
                <span className="font-medium">Challenge:</span>{' '}
                {currentRoom.currentChallenge.question}
              </p>
              {currentRoom.currentChallenge.from === playerName && !currentRoom.currentChallenge.completed && (
                <button
                  onClick={markChallengeComplete}
                  className="mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                >
                  <Check size={20} />
                  Mark as Complete
                </button>
              )}
            </div>
          )}

          {currentRoom.currentTurn === playerName && !currentRoom.currentChallenge?.completed && (
            <div className="space-y-4">
              <textarea
                value={challenge}
                onChange={(e) => setChallenge(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                placeholder="Enter your truth question or dare challenge..."
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => sendChallenge('truth')}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Play size={20} />
                  Ask Truth
                </button>
                <button
                  onClick={() => sendChallenge('dare')}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <Play size={20} />
                  Give Dare
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;