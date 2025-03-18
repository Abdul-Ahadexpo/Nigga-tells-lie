import React, { useState, useEffect } from 'react';
import { ref, onValue, set, push, remove } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';
import { Users, DoorOpen, Play, Check, MessageCircle, Crown, UserCheck, X, UserX } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { Room, User } from './types';
import { AuthForm } from './components/AuthForm';
import { CreateRoomModal } from './components/CreateRoomModal';
import { JoinRoomModal } from './components/JoinRoomModal';
import { KickVoteModal } from './components/KickVoteModal';
import { ThemeToggle } from './components/ThemeToggle';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState<Room | null>(null);
  const [showKickVote, setShowKickVote] = useState<string | null>(null);
  const [challenge, setChallenge] = useState('');
  const [response, setResponse] = useState('');
  const [reaction, setReaction] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = ref(db, `users/${firebaseUser.uid}`);
        onValue(userRef, (snapshot) => {
          const userData = snapshot.val();
          if (userData) {
            setUser(userData);
          }
        });
      } else {
        setUser(null);
        setCurrentRoom(null);
      }
    });

    return () => unsubAuth();
  }, []);

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
            // Check if user was kicked
            if (!updatedRoom.players.includes(user?.username || '')) {
              setCurrentRoom(null);
              toast.error('You have been kicked from the room');
              return;
            }
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
  }, [currentRoom?.id, user?.username]);

  const createRoom = async (data: { roomName: string; isPrivate: boolean; password?: string }) => {
    if (!user) return;

    const roomsRef = ref(db, 'rooms');
    const newRoomRef = push(roomsRef);
    const newRoom = {
      name: data.roomName,
      players: [user.username],
      currentTurn: user.username,
      isPrivate: data.isPrivate,
      password: data.password,
      owner: user.uid,
      kickVotes: {},
      score: { [user.username]: 0 },
    };

    await set(newRoomRef, newRoom);
    setShowCreateRoom(false);
    setCurrentRoom({ ...newRoom, id: newRoomRef.key! });
    toast.success('Room created successfully!');
  };

  const joinRoom = async (room: Room, password?: string) => {
    if (!user) return;

    if (room.isPrivate && room.password !== password) {
      toast.error('Incorrect password');
      return;
    }

    if (room.players.includes(user.username)) {
      setCurrentRoom(room);
      return;
    }

    const updatedPlayers = [...room.players, user.username];
    const updatedRoom = {
      ...room,
      players: updatedPlayers,
      score: { ...room.score, [user.username]: 0 },
    };

    await set(ref(db, `rooms/${room.id}`), updatedRoom);
    setShowJoinRoom(null);
    setCurrentRoom(updatedRoom);
    toast.success('Joined room successfully!');
  };

  const handleKickVote = async (targetPlayer: string) => {
    if (!currentRoom || !user) return;

    const currentVotes = currentRoom.kickVotes[targetPlayer] || [];
    if (currentVotes.includes(user.uid)) {
      toast.error('You have already voted to kick this player');
      return;
    }

    const updatedVotes = [...currentVotes, user.uid];
    const requiredVotes = getRequiredVotes(currentRoom.players.length);

    const updatedRoom = {
      ...currentRoom,
      kickVotes: {
        ...currentRoom.kickVotes,
        [targetPlayer]: updatedVotes,
      },
    };

    if (updatedVotes.length >= requiredVotes) {
      // Remove player from room
      updatedRoom.players = updatedRoom.players.filter(p => p !== targetPlayer);
      delete updatedRoom.kickVotes[targetPlayer];
      if (updatedRoom.currentTurn === targetPlayer) {
        updatedRoom.currentTurn = updatedRoom.players[0];
      }
      toast.success(`${targetPlayer} has been kicked from the room`);
    }

    await set(ref(db, `rooms/${currentRoom.id}`), updatedRoom);
    setShowKickVote(null);
  };

  const getRequiredVotes = (playerCount: number) => {
    if (playerCount <= 3) return 2;
    if (playerCount <= 5) return 3;
    return 4;
  };

  const getCurrentVotes = (targetPlayer: string) => {
    if (!currentRoom) return 0;
    return (currentRoom.kickVotes[targetPlayer] || []).length;
  };

  const sendChallenge = async (type: 'truth' | 'dare') => {
    if (!currentRoom || !challenge || !selectedPlayer || !user) {
      toast.error('Please enter a challenge and select a player');
      return;
    }

    const updatedRoom = {
      ...currentRoom,
      currentTurn: selectedPlayer,
      currentChallenge: {
        type,
        question: challenge,
        from: user.username,
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
    if (!currentRoom?.currentChallenge || !response || !user) return;

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
    if (!currentRoom?.currentChallenge || !reaction || !user) return;

    const updatedRoom = {
      ...currentRoom,
      currentChallenge: {
        ...currentRoom.currentChallenge,
        reactions: {
          ...currentRoom.currentChallenge.reactions,
          [user.username]: reaction,
        },
      },
    };

    await set(ref(db, `rooms/${currentRoom.id}`), updatedRoom);
    setReaction('');
  };

  const markChallengeComplete = async (completed: boolean) => {
    if (!currentRoom?.currentChallenge || !user) return;

    const updatedScore = { ...currentRoom.score };
    if (completed) {
      updatedScore[currentRoom.currentChallenge.to] = (updatedScore[currentRoom.currentChallenge.to] || 0) + 1;
      
      const winner = Object.entries(updatedScore).find(([_, score]) => score >= 15);
      if (winner) {
        toast.success(`🎉 ${winner[0]} wins the game with ${winner[1]} points! 👑`, {
          duration: 5000
        });
        Object.keys(updatedScore).forEach(player => {
          updatedScore[player] = 0;
        });
      }
    }

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
    if (completed) {
      toast.success('Challenge completed! +1 point! 🎉');
    } else {
      toast.error('Challenge marked as not completed');
    }
  };

  const leaveRoom = async () => {
    if (!currentRoom || !user) return;

    const updatedPlayers = currentRoom.players.filter(p => p !== user.username);
    
    if (updatedPlayers.length === 0) {
      await remove(ref(db, `rooms/${currentRoom.id}`));
    } else {
      const newRoom = {
        name: currentRoom.name,
        players: updatedPlayers,
        currentTurn: updatedPlayers[0],
        isPrivate: currentRoom.isPrivate,
        password: currentRoom.password,
        owner: currentRoom.owner,
        kickVotes: Object.entries(currentRoom.kickVotes || {})
          .filter(([player]) => player !== user.username)
          .reduce((acc, [player, votes]) => ({
            ...acc,
            [player]: votes.filter(v => v !== user.uid)
          }), {}),
        score: Object.entries(currentRoom.score || {})
          .filter(([player]) => player !== user.username)
          .reduce((acc, [player, score]) => ({ ...acc, [player]: score }), {}),
      };

      if (currentRoom.currentChallenge &&
          currentRoom.currentChallenge.from !== user.username &&
          currentRoom.currentChallenge.to !== user.username) {
        newRoom.currentChallenge = currentRoom.currentChallenge;
      }

      await set(ref(db, `rooms/${currentRoom.id}`), newRoom);
    }
    
    setCurrentRoom(null);
    toast.success('Left room successfully');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-4 md:p-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <AuthForm />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-4 md:p-8">
      <Toaster position="top-right" />
      <div className="absolute top-4 right-4 flex items-center gap-4">
        <span className="text-white">{user.username}</span>
        <ThemeToggle />
      </div>
      
      {!currentRoom ? (
        <div className="max-w-md mx-auto bg-card rounded-xl shadow-xl p-4 md:p-6">
          <h1 className="text-3xl md:text-4xl font-extrabold text-card-foreground mb-4 flex items-center justify-center text-center">
            <Crown className="w-8 h-8 mr-2 text-yellow-500" />
            Truth or Dare
          </h1>
          <p className="text-lg text-muted-foreground flex items-center justify-center text-center">
            Challenge your friends in this exciting game!
          </p>
          
          <div className="space-y-4 mt-6 md:mt-8">
            <div className="border-t pt-4">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Create New Room</h2>
              <button
                onClick={() => setShowCreateRoom(true)}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center justify-center gap-2"
              >
                <Users size={20} />
                Create Room
              </button>
            </div>

            <div className="border-t pt-4">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Available Rooms</h2>
              <div className="space-y-2">
                {rooms.map((room) => (
                  <div key={room.id} className="flex items-center justify-between bg-muted p-3 rounded-md">
                    <div>
                      <p className="font-medium text-card-foreground">
                        {room.name} {room.isPrivate && '🔒'}
                      </p>
                      <p className="text-sm text-muted-foreground">{room.players.length} players</p>
                    </div>
                    <button
                      onClick={() => setShowJoinRoom(room)}
                      className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
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
        <div className="max-w-2xl mx-auto bg-card rounded-xl shadow-xl p-4 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 md:gap-0">
            <div>
              <h2 className="text-2xl font-bold text-card-foreground">
                Room: {currentRoom.name} {currentRoom.isPrivate && '🔒'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Game in progress • First to 15 points wins!
              </p>
            </div>
            <button
              onClick={leaveRoom}
              className="w-full md:w-auto px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
            >
              Leave Room
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-card-foreground">Players & Scores:</h3>
            <div className="flex gap-2 flex-wrap">
              {currentRoom.players.map((player) => (
                <div
                  key={player}
                  className={`px-3 py-1 rounded-full flex items-center gap-2 ${
                    player === currentRoom.currentTurn
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                      : player === user.username
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <span>
                    {player} {player === user.username && '(You)'} 
                    {player === currentRoom.currentTurn && '🎲'}
                    <span className="ml-1 font-bold">
                      {currentRoom.score?.[player] || 0}pts
                    </span>
                  </span>
                  {player !== user.username && (
                    <button
                      onClick={() => setShowKickVote(player)}
                      className="hover:text-destructive"
                      title="Vote to kick"
                    >
                      <UserX size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {currentRoom.currentChallenge && (
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-card-foreground">Current Challenge:</h3>
              <div className="space-y-2">
                <p className="text-card-foreground">
                  <span className="font-medium">From:</span> {currentRoom.currentChallenge.from}
                </p>
                <p className="text-card-foreground">
                  <span className="font-medium">To:</span> {currentRoom.currentChallenge.to}
                </p>
                <p className="text-card-foreground">
                  <span className="font-medium">Type:</span>{' '}
                  <span className={`capitalize font-bold ${
                    currentRoom.currentChallenge.type === 'truth' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {currentRoom.currentChallenge.type}
                  </span>
                </p>
                <p className="text-card-foreground">
                  <span className="font-medium">Challenge:</span>{' '}
                  <span className="text-lg">{currentRoom.currentChallenge.question}</span>
                </p>

                {currentRoom.currentChallenge.to === user.username && !currentRoom.currentChallenge.completed && (
                  <div className="mt-4 p-4 bg-card rounded-lg border border-border">
                    <p className="text-destructive font-semibold mb-2">
                      ⚠️ It's your turn to respond to this challenge!
                    </p>
                    <textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      className="w-full rounded-md border-input bg-background text-foreground shadow-sm focus:border-primary focus:ring focus:ring-primary/20"
                      placeholder="Type your response..."
                      rows={2}
                    />
                    <button
                      onClick={submitResponse}
                      className="mt-2 w-full md:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2 justify-center"
                    >
                      <MessageCircle size={20} />
                      Submit Response
                    </button>
                  </div>
                )}

                {currentRoom.currentChallenge.response && (
                  <div className="mt-4 p-4 bg-card rounded-lg border border-border">
                    <p className="font-medium text-card-foreground">Response:</p>
                    <p className="text-lg text-card-foreground">{currentRoom.currentChallenge.response}</p>
                    
                    {!currentRoom.currentChallenge.reactions?.[user.username] && (
                      <div className="mt-2 flex flex-col md:flex-row gap-2">
                        <input
                          type="text"
                          value={reaction}
                          onChange={(e) => setReaction(e.target.value)}
                          className="flex-1 rounded-md border-input bg-background text-foreground shadow-sm focus:border-primary focus:ring focus:ring-primary/20"
                          placeholder="Add a reaction..."
                        />
                        <button
                          onClick={addReaction}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                          React
                        </button>
                      </div>
                    )}

                    {currentRoom.currentChallenge.reactions && Object.keys(currentRoom.currentChallenge.reactions).length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium text-card-foreground">Reactions:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {Object.entries(currentRoom.currentChallenge.reactions).map(([player, reaction]) => (
                            <span key={player} className="px-2 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                              {player}: {reaction}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!currentRoom.currentChallenge.completed && currentRoom.currentChallenge.from === user.username && currentRoom.currentChallenge.response && (
                  <div className="mt-4 flex flex-col md:flex-row gap-2">
                    <button
                      onClick={() => markChallengeComplete(true)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 justify-center dark:bg-green-700 dark:hover:bg-green-600"
                    >
                      <Check size={20} />
                      Accept Response & Complete Challenge
                    </button>
                    <button
                      onClick={() => markChallengeComplete(false)}
                      className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 flex items-center gap-2 justify-center"
                    >
                      <X size={20} />
                      Challenge Not Completed
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentRoom.currentTurn === user.username && (!currentRoom.currentChallenge || currentRoom.currentChallenge.completed) && (
            <div className="space-y-4">
              <p className="text-green-600 dark:text-green-400 font-semibold text-lg">
                🎲 It's your turn to give a challenge!
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  Select Player to Challenge:
                </label>
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  className="w-full rounded-md border-input bg-background text-foreground shadow-sm focus:border-primary focus:ring focus:ring-primary/20"
                >
                  <option value="">Choose a player...</option>
                  {currentRoom.players
                    .filter(player => player !== user.username)
                    .map(player => (
                      <option key={player} value={player}>{player}</option>
                    ))
                  }
                </select>
              </div>
              
              <textarea
                value={challenge}
                onChange={(e) => setChallenge(e.target.value)}
                className="w-full rounded-md border-input bg-background text-foreground shadow-sm focus:border-primary focus:ring focus:ring-primary/20"
                placeholder="Enter your truth question or dare challenge..."
                rows={3}
              />
              <div className="flex flex-col md:flex-row gap-2">
                <button
                  onClick={() => sendChallenge('truth')}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  <Play size={20} />
                  Ask Truth
                </button>
                <button
                  onClick={() => sendChallenge('dare')}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center gap-2 dark:bg-red-700 dark:hover:bg-red-600"
                >
                  <Play size={20} />
                  Give Dare
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showCreateRoom && (
        <CreateRoomModal
          onSubmit={createRoom}
          onClose={() => setShowCreateRoom(false)}
        />
      )}

      {showJoinRoom && (
        <JoinRoomModal
          room={showJoinRoom}
          onJoin={(password) => joinRoom(showJoinRoom, password)}
          onClose={() => setShowJoinRoom(null)}
        />
      )}

      {showKickVote && (
        <KickVoteModal
          room={currentRoom!}
          targetPlayer={showKickVote}
          onVote={() => handleKickVote(showKickVote)}
          onClose={() => setShowKickVote(null)}
          currentVotes={getCurrentVotes(showKickVote)}
          requiredVotes={getRequiredVotes(currentRoom!.players.length)}
        />
      )}
    </div>
  );
}

export default App;