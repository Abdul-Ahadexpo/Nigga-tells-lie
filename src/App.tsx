import React, { useState, useEffect } from 'react';
import { ref, onValue, set, push, remove } from 'firebase/database';
import { db } from './firebase';
import { Users, DoorOpen, Play, Check, MessageCircle, Crown, UserCheck, X, Trash2, Ban } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { CreateRoomModal } from './components/CreateRoomModal';
import { JoinRoomModal } from './components/JoinRoomModal';
import { KickVoteModal } from './components/KickVoteModal';
import { ThemeToggle } from './components/ThemeToggle';
import { Chat } from './components/Chat';
import { Room, ChatMessage } from './types';

function App() {
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState<Room | null>(null);
  const [showKickModal, setShowKickModal] = useState<string | null>(null);
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
          } else {
            setCurrentRoom(null); // Room was deleted
          }
        }
      } else {
        setRooms([]);
        setCurrentRoom(null);
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

  const handleCreateRoom = async (data: { roomName: string; isPrivate: boolean; password?: string }) => {
    if (!playerName) {
      toast.error('Please enter your name first');
      return;
    }

    const roomsRef = ref(db, 'rooms');
    const newRoomRef = push(roomsRef);
    const newRoom = {
      name: data.roomName,
      players: [playerName],
      currentTurn: playerName,
      isPrivate: data.isPrivate,
      ...(data.isPrivate ? { password: data.password } : {}),
      owner: playerName,
      kickVotes: {},
      score: { [playerName]: 0 },
      messages: [],
    };

    await set(newRoomRef, newRoom);
    setShowCreateModal(false);
    setCurrentRoom({ ...newRoom, id: newRoomRef.key! });
    toast.success('Room created successfully!');
  };

  const handleJoinRoom = async (room: Room, password?: string) => {
    if (!playerName) {
      toast.error('Please enter your name first');
      return;
    }

    if (room.isPrivate && room.password !== password) {
      toast.error('Incorrect password');
      return;
    }

    if (room.players.includes(playerName)) {
      setCurrentRoom(room);
      setShowJoinModal(null);
      return;
    }

    const updatedPlayers = [...room.players, playerName];
    const updatedRoom = {
      ...room,
      players: updatedPlayers,
      score: { ...room.score, [playerName]: 0 },
    };

    await set(ref(db, `rooms/${room.id}`), updatedRoom);
    setShowJoinModal(null);
    setCurrentRoom(updatedRoom);
    toast.success('Joined room successfully!');
  };

  const handleDeleteRoom = async (roomId: string) => {
    await remove(ref(db, `rooms/${roomId}`));
    setCurrentRoom(null);
    toast.success('Room deleted successfully');
  };

  const handleKickVote = async (targetPlayer: string) => {
    if (!currentRoom || !playerName) return;

    const currentVotes = currentRoom.kickVotes?.[targetPlayer] || [];
    if (currentVotes.includes(playerName)) {
      toast.error('You have already voted to kick this player');
      return;
    }

    const updatedVotes = [...currentVotes, playerName];
    const requiredVotes = currentRoom.players.length >= 8 ? 4 :
                         currentRoom.players.length >= 5 ? 3 : 2;

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
      
      // Update turn if needed
      if (updatedRoom.currentTurn === targetPlayer) {
        const nextPlayerIndex = currentRoom.players.indexOf(targetPlayer) + 1;
        updatedRoom.currentTurn = updatedRoom.players[nextPlayerIndex % updatedRoom.players.length];
      }
      
      // Remove from scores
      if (updatedRoom.score) {
        const { [targetPlayer]: _, ...remainingScores } = updatedRoom.score;
        updatedRoom.score = remainingScores;
      }
      
      toast.success(`${targetPlayer} has been kicked from the room`);
    } else {
      toast.info(`Vote recorded (${updatedVotes.length}/${requiredVotes} votes needed)`);
    }

    await set(ref(db, `rooms/${currentRoom.id}`), updatedRoom);
    setShowKickModal(null);
  };

  const handleSendMessage = async (message: string) => {
    if (!currentRoom) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: playerName,
      message,
      timestamp: Date.now(),
    };

    const updatedRoom = {
      ...currentRoom,
      messages: [...(currentRoom.messages || []), newMessage],
    };

    await set(ref(db, `rooms/${currentRoom.id}`), updatedRoom);
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

  const markChallengeComplete = async (completed: boolean) => {
    if (!currentRoom?.currentChallenge) return;

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
    if (!currentRoom) return;

    const updatedPlayers = currentRoom.players.filter(p => p !== playerName);
    
    if (updatedPlayers.length === 0) {
      await remove(ref(db, `rooms/${currentRoom.id}`));
    } else {
      const newRoom = {
        ...currentRoom,
        players: updatedPlayers,
        currentTurn: currentRoom.owner === playerName ? updatedPlayers[0] : currentRoom.currentTurn,
        owner: currentRoom.owner === playerName ? updatedPlayers[0] : currentRoom.owner,
        score: Object.entries(currentRoom.score || {})
          .filter(([player]) => player !== playerName)
          .reduce((acc, [player, score]) => ({ ...acc, [player]: score }), {}),
      };

      if (currentRoom.currentChallenge &&
          (currentRoom.currentChallenge.from === playerName ||
           currentRoom.currentChallenge.to === playerName)) {
        delete newRoom.currentChallenge;
      }

      await set(ref(db, `rooms/${currentRoom.id}`), newRoom);
    }
    
    setCurrentRoom(null);
    toast.success('Left room successfully');
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>
      
      {showCreateModal && (
        <CreateRoomModal
          onSubmit={handleCreateRoom}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {showJoinModal && (
        <JoinRoomModal
          room={showJoinModal}
          onJoin={(password) => handleJoinRoom(showJoinModal, password)}
          onClose={() => setShowJoinModal(null)}
        />
      )}

      {showKickModal && (
        <KickVoteModal
          room={currentRoom!}
          targetPlayer={showKickModal}
          onVote={() => handleKickVote(showKickModal)}
          onClose={() => setShowKickModal(null)}
          currentVotes={(currentRoom?.kickVotes?.[showKickModal]?.length || 0)}
          requiredVotes={currentRoom!.players.length >= 8 ? 4 :
                        currentRoom!.players.length >= 5 ? 3 : 2}
        />
      )}
      
      {!currentRoom ? (
        <div className="max-w-md mx-auto p-4 md:p-6">
          <div className="bg-card rounded-lg shadow-lg p-6">
            <h1 className="text-3xl md:text-4xl font-extrabold text-card-foreground mb-4 flex items-center justify-center text-center">
              <Crown className="w-8 h-8 mr-2" />
              Truth or Dare
            </h1>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-card-foreground">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-input bg-background text-foreground shadow-sm focus:ring-2 focus:ring-ring"
                  placeholder="Enter your name"
                />
              </div>

              <div className="border-t border-border pt-4">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center justify-center gap-2"
                >
                  <Users size={20} />
                  Create New Room
                </button>
              </div>

              <div className="border-t border-border pt-4">
                <h2 className="text-xl font-semibold mb-4 text-card-foreground">Available Rooms</h2>
                <div className="space-y-2">
                  {rooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between bg-accent rounded-md p-3">
                      <div>
                        <p className="font-medium text-accent-foreground">{room.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {room.players.length} players • {room.isPrivate ? '🔒 Private' : '🌐 Public'}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowJoinModal(room)}
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
        </div>
      ) : (
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          <div className="bg-card rounded-lg shadow-lg p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 md:gap-0">
              <div>
                <h2 className="text-2xl font-bold text-card-foreground">
                  {currentRoom.name}
                  {currentRoom.isPrivate && <span className="ml-2">🔒</span>}
                </h2>
                <p className="text-sm text-muted-foreground">First to 15 points wins!</p>
              </div>
              <div className="flex gap-2">
                {currentRoom.owner === playerName && (
                  <button
                    onClick={() => handleDeleteRoom(currentRoom.id)}
                    className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 flex items-center gap-2"
                  >
                    <Trash2 size={20} />
                    Delete Room
                  </button>
                )}
                <button
                  onClick={leaveRoom}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
                >
                  Leave Room
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-card-foreground">Players & Scores:</h3>
              <div className="flex flex-wrap gap-2">
                {currentRoom.players.map((player) => (
                  <div
                    key={player}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                      player === currentRoom.currentTurn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    <span>
                      {player}
                      {player === playerName && ' (You)'}
                      {player === currentRoom.owner && ' 👑'}
                      <span className="ml-1 font-bold">
                        {currentRoom.score?.[player] || 0}pts
                      </span>
                    </span>
                    {player !== playerName && player !== currentRoom.owner && (
                      <button
                        onClick={() => setShowKickModal(player)}
                        className="hover:text-destructive"
                        title="Vote to kick"
                      >
                        <Ban size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                {currentRoom.currentChallenge && (
                  <div className="bg-accent rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2 text-accent-foreground">Current Challenge:</h3>
                    <div className="space-y-2">
                      <p className="text-accent-foreground">
                        <span className="font-medium">From:</span> {currentRoom.currentChallenge.from}
                      </p>
                      <p className="text-accent-foreground">
                        <span className="font-medium">To:</span> {currentRoom.currentChallenge.to}
                      </p>
                      <p className="text-accent-foreground">
                        <span className="font-medium">Type:</span>{' '}
                        <span className={`capitalize font-bold`}>
                          {currentRoom.currentChallenge.type}
                        </span>
                      </p>
                      <p className="text-accent-foreground">
                        <span className="font-medium">Challenge:</span>{' '}
                        <span className="text-lg">{currentRoom.currentChallenge.question}</span>
                      </p>

                      {currentRoom.currentChallenge.to === playerName && !currentRoom.currentChallenge.completed && (
                        <div className="mt-4 bg-card rounded-lg border border-border p-4">
                          <p className="text-destructive font-semibold mb-2">
                            ⚠️ It's your turn to respond!
                          </p>
                          <textarea
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            className="w-full rounded-md border-input bg-background text-foreground shadow-sm focus:ring-2 focus:ring-ring"
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
                        <div className="mt-4 bg-card rounded-lg border border-border p-4">
                          <p className="font-medium text-card-foreground">Response:</p>
                          <p className="text-lg text-card-foreground">
                            {currentRoom.currentChallenge.response}
                          </p>
                          
                          {!currentRoom.currentChallenge.reactions?.[playerName] && (
                            <div className="mt-2 flex flex-col md:flex-row gap-2">
                              <input
                                type="text"
                                value={reaction}
                                onChange={(e) => setReaction(e.target.value)}
                                className="flex-1 rounded-md border-input bg-background text-foreground shadow-sm focus:ring-2 focus:ring-ring"
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

                          {currentRoom.currentChallenge.reactions && 
                           Object.keys(currentRoom.currentChallenge.reactions).length > 0 && (
                            <div className="mt-2">
                              <p className="font-medium text-card-foreground">Reactions:</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {Object.entries(currentRoom.currentChallenge.reactions).map(([player, reaction]) => (
                                  <span key={player} className="px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                                    {player}: {reaction}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {!currentRoom.currentChallenge.completed && 
                       currentRoom.currentChallenge.from === playerName && 
                       currentRoom.currentChallenge.response && (
                        <div className="mt-4 flex flex-col md:flex-row gap-2">
                          <button
                            onClick={() => markChallengeComplete(true)}
                            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2 justify-center"
                          >
                            <Check size={20} />
                            Accept Response
                          </button>
                          <button
                            onClick={() => markChallengeComplete(false)}
                            className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 flex items-center gap-2 justify-center"
                          >
                            <X size={20} />
                            Reject Response
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentRoom.currentTurn === playerName && 
                 (!currentRoom.currentChallenge || currentRoom.currentChallenge.completed) && (
                  <div className="space-y-4">
                    <p className="text-primary font-semibold text-lg">
                      🎲 It's your turn to give a challenge!
                    </p>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-card-foreground mb-1">
                        Select Player to Challenge:
                      </label>
                      <select
                        value={selectedPlayer}
                        onChange={(e) => setSelectedPlayer(e.target.value)}
                        className="w-full rounded-md border-input bg-background text-foreground shadow-sm focus:ring-2 focus:ring-ring"
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
                      className="w-full rounded-md border-input bg-background text-foreground shadow-sm focus:ring-2 focus:ring-ring"
                      placeholder="Enter your truth question or dare challenge..."
                      rows={3}
                    />
                    <div className="flex flex-col md:flex-row gap-2">
                      <button
                        onClick={() => sendChallenge('truth')}
                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center justify-center gap-2"
                      >
                        <Play size={20} />
                        Ask Truth
                      </button>
                      <button
                        onClick={() => sendChallenge('dare')}
                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center justify-center gap-2"
                      >
                        <Play size={20} />
                        Give Dare
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <Chat
                messages={currentRoom.messages || []}
                onSendMessage={handleSendMessage}
                className="sticky top-4"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;