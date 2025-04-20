import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { ChatMessage } from '../types';

type Props = {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  className?: string;
};

export function Chat({ messages, onSendMessage, className = '' }: Props) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  return (
    <div className={`flex flex-col h-[500px] md:h-[600px] bg-card rounded-lg shadow-md ${className}`}>
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <MessageSquare className="w-5 h-5" />
        <h3 className="font-semibold">Room Chat</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col bg-accent rounded-lg p-2">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-sm">{msg.sender}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm mt-1">{msg.message}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-md border-input bg-background text-foreground shadow-sm focus:ring-2 focus:ring-ring px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}