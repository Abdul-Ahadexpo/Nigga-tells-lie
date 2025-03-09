import React, { useState, useEffect } from 'react';
import { ref, onValue, set, push } from 'firebase/database';
import { db } from './firebase';
import { Users, DoorOpen, Play, Check, MessageCircle, Crown, UserCheck } from 'lucide-react';
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
    response?: string;
    reactions?: { [key: string]: string };
  };
  score?: { [key: string]: number };
};

function App() {
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || '');
  const [roomName, setRoomName] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [challenge, setChallenge] = useState('');
  const [response, setResponse] = useState('');
  const [reaction, setReaction] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');

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
          if (updatedRoom) {
            setCurrentRoom(updatedRoom);
          }
        }
      } else {
        setRooms([]);
      }
    });

    return () => {
      // Firebase will handle unsubscribe
    };
  }, [currentRoom?.id]);

  useEffect(() => {
    if (playerName) {
      localStorage.setItem('playerName', playerName);
    }
  }, [playerName]);

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
      score: { [playerName]: 0 },
    };

    await set(newRoomRef, newRoom);
    setRoomName('');
    setCurrentRoom({ ...newRoom, id: newRoomRef.key! });
    toast.success('Room created successfully!');
  };

  const joinRoom = async (room: Room) => {
    if (!playerName) {
      toast.error('Please enter your name first');
      return;
    }

    if (room.players.includes(playerName)) {
      setCurrentRoom(room);
      return;
    }

    const updatedPlayers = [...room.players, playerName];
    const updatedRoom = {
      ...room,
      players: updatedPlayers,
      score: { ...room.score, [playerName]: 0 },
    };

    await set(ref(db, `rooms/${room.id}`), updatedRoom);
    setCurrentRoom(updatedRoom);
    toast.success('Joined room successfully!');
  };

  const sendChallenge = async (type: 'truth' | 'dare') => {
    if (!currentRoom || !challenge || !selectedPlayer) {
      toast.error('Please enter a challenge and select a player');
      return;
    }

    const updatedRoom = {
      ...currentRoom,
      currentTurn: selectedPlayer,
      currentChallenge: {
        type,
        question: challenge,
        from: playerName,
        to: selectedPlayer,
        completed: false,
        reactions: {},
      },
    };

    await set(ref(db, `rooms/${currentRoom.id}`), updatedRoom);
    setChallenge('');
    setSelectedPlayer('');
    toast.success(`${type} challenge sent to ${selectedPlayer}!`);
  };

  const submitResponse = async () => {
    if (!currentRoom?.currentChallenge || !response) return;

    const updatedRoom = {
      ...currentRoom,
      currentChallenge: {
        ...currentRoom.currentChallenge,
        response,
      },
    };

    await set(ref(db, `rooms/${currentRoom.id}`), updatedRoom);
    setResponse('');
    toast.success('Response submitted!');
  };

  const addReaction = async () => {
    if (!currentRoom?.currentChallenge || !reaction) return;

    const updatedRoom = {
      ...currentRoom,
      currentChallenge: {
        ...currentRoom.currentChallenge,
        reactions: {
          ...currentRoom.currentChallenge.reactions,
          [playerName]: reaction,
        },
      },
    };

    await set(ref(db, `rooms/${currentRoom.id}`), updatedRoom);
    setReaction('');
  };

  const markChallengeComplete = async () => {
    if (!currentRoom?.currentChallenge) return;

    // Update scores
    const updatedScore = { ...currentRoom.score };
    updatedScore[currentRoom.currentChallenge.to] = (updatedScore[currentRoom.currentChallenge.to] || 0) + 1;

    const updatedRoom = {
      ...currentRoom,
      currentTurn: currentRoom.currentChallenge.to,
      currentChallenge: {
        ...currentRoom.currentChallenge,
        completed: true,
      },
      score: updatedScore,
    };

    await set(ref(db, `rooms/${currentRoom.id}`), updatedRoom);
    toast.success('Challenge completed! +1 point! 🎉');
  };

  const leaveRoom = async () => {
    if (!currentRoom) return;

    const updatedPlayers = currentRoom.players.filter(p => p !== playerName);
    
    if (updatedPlayers.length === 0) {
      // Delete the room if no players left
      await set(ref(db, `rooms/${currentRoom.id}`), null);
    } else {
      // Update room with remaining players
      const updatedRoom = {
        ...currentRoom,
        players: updatedPlayers,
        currentTurn: updatedPlayers[0],
        // Remove current challenge if it involves the leaving player
        currentChallenge: currentRoom.currentChallenge?.from === playerName || 
                         currentRoom.currentChallenge?.to === playerName 
                         ? undefined 
                         : currentRoom.currentChallenge,
        // Remove player's score
        score: Object.entries(currentRoom.score || {})
          .filter(([player]) => player !== playerName)
          .reduce((acc, [player, score]) => ({ ...acc, [player]: score }), {}),
      };
      await set(ref(db, `rooms/${currentRoom.id}`), updatedRoom);
    }
    
    setCurrentRoom(null);
    toast.success('Left room successfully');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-4 md:p-8">
      <Toaster position="top-right" />
      
      {!currentRoom ? (
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-xl p-4 md:p-6">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-4 flex items-center justify-center text-center">
            <Crown className="w-8 h-8 mr-2 text-yellow-500" />
            Truth or Dare
          </h1>
        <p className="text-lg text-gray-600 flex items-center justify-center text-center">Challenge your nigga friends in this shitty game!</p>
          
          <div className="space-y-4 mt-6 md:mt-8">
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
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-xl p-4 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 md:gap-0">
            <div>
              <h2 className="text-2xl font-bold">Room: {currentRoom.name}</h2>
              <p className="text-sm text-gray-500">Game in progress</p>
            </div>
            <button
              onClick={leaveRoom}
              className="w-full md:w-auto px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Leave Room
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Players & Scores:</h3>
            <div className="flex gap-2 flex-wrap">
              {currentRoom.players.map((player) => (
                <span
                  key={player}
                  className={`px-3 py-1 rounded-full ${
                    player === currentRoom.currentTurn
                      ? 'bg-green-100 text-green-800 font-bold'
                      : player === playerName
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {player} {player === playerName && '(You)'} 
                  {player === currentRoom.currentTurn && '🎲'}
                  <span className="ml-1 font-bold">
                    {currentRoom.score?.[player] || 0}pts
                  </span>
                </span>
              ))}
            </div>
          </div>

          {currentRoom.currentChallenge && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Current Challenge:</h3>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">From:</span> {currentRoom.currentChallenge.from}
                </p>
                <p>
                  <span className="font-medium">To:</span> {currentRoom.currentChallenge.to}
                </p>
                <p>
                  <span className="font-medium">Type:</span>{' '}
                  <span className={`capitalize font-bold ${
                    currentRoom.currentChallenge.type === 'truth' ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {currentRoom.currentChallenge.type}
                  </span>
                </p>
                <p>
                  <span className="font-medium">Challenge:</span>{' '}
                  <span className="text-lg">{currentRoom.currentChallenge.question}</span>
                </p>

                {currentRoom.currentChallenge.to === playerName && !currentRoom.currentChallenge.completed && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-yellow-200">
                    <p className="text-red-600 font-semibold mb-2">
                      ⚠️ It's your turn to respond to this challenge!
                    </p>
                    <textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                      placeholder="Type your response..."
                      rows={2}
                    />
                    <button
                      onClick={submitResponse}
                      className="mt-2 w-full md:w-auto px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2 justify-center"
                    >
                      <MessageCircle size={20} />
                      Submit Response
                    </button>
                  </div>
                )}

                {currentRoom.currentChallenge.response && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                    <p className="font-medium">Response:</p>
                    <p className="text-lg">{currentRoom.currentChallenge.response}</p>
                    
                    {!currentRoom.currentChallenge.reactions?.[playerName] && (
                      <div className="mt-2 flex flex-col md:flex-row gap-2">
                        <input
                          type="text"
                          value={reaction}
                          onChange={(e) => setReaction(e.target.value)}
                          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                          placeholder="Add a reaction..."
                        />
                        <button
                          onClick={addReaction}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          React
                        </button>
                      </div>
                    )}

                    {currentRoom.currentChallenge.reactions && Object.keys(currentRoom.currentChallenge.reactions).length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Reactions:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {Object.entries(currentRoom.currentChallenge.reactions).map(([player, reaction]) => (
                            <span key={player} className="px-2 py-1 bg-gray-100 rounded-full text-sm">
                              {player}: {reaction}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!currentRoom.currentChallenge.completed && currentRoom.currentChallenge.from === playerName && currentRoom.currentChallenge.response && (
                  <button
                    onClick={markChallengeComplete}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 w-full justify-center"
                  >
                    <Check size={20} />
                    Accept Response & Complete Challenge
                  </button>
                )}
              </div>
            </div>
          )}

          {currentRoom.currentTurn === playerName && (!currentRoom.currentChallenge || currentRoom.currentChallenge.completed) && (
            <div className="space-y-4">
              <p className="text-green-600 font-semibold text-lg">🎲 It's your turn to give a challenge!</p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Player to Challenge:</label>
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                >
                  <option value="">Choose a player...</option>
                  {currentRoom.players
                    .filter(player => player !== playerName)
                    .map(player => (
                      <option key={player} value={player}>{player}</option>
                    ))
                  }
                </select>
              </div>
              
              <textarea
                value={challenge}
                onChange={(e) => setChallenge(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                placeholder="Enter your truth question or dare challenge..."
                rows={3}
              />
              <div className="flex flex-col md:flex-row gap-2">
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
