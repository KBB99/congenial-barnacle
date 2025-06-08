'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Agent, ChatMessage } from '@/lib/types';
import { chatApi } from '@/lib/api';
import { useConversationUpdates } from '@/hooks/useWebSocket';
import { formatRelativeTime } from '@/lib/utils';

interface ChatInterfaceProps {
  worldId: string;
  agents: Agent[];
  selectedAgentId: string | null;
}

export function ChatInterface({ worldId, agents, selectedAgentId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [targetAgent, setTargetAgent] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessageMutation = useMutation({
    mutationFn: ({ message, agentId }: { message: string; agentId?: string }) =>
      chatApi.sendMessage(worldId, message, agentId),
    onSuccess: (response) => {
      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: inputValue,
        timestamp: new Date().toISOString(),
      };

      // Add agent response if any
      const agentMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: response.content || 'Agent received your message.',
        timestamp: new Date().toISOString(),
        agentId: response.agentId,
        agentName: response.agentName,
      };

      setMessages(prev => [...prev, userMessage, agentMessage]);
      setInputValue('');
    },
  });

  // Listen for conversation updates
  useConversationUpdates(worldId, (data) => {
    const conversation = data.conversation;
    const newMessages = conversation.messages.map((msg: any) => ({
      id: msg.messageId,
      type: msg.speakerId === 'user' ? 'user' : 'agent',
      content: msg.content,
      timestamp: msg.timestamp,
      agentId: msg.speakerId !== 'user' ? msg.speakerId : undefined,
      agentName: msg.speakerId !== 'user' 
        ? agents.find(a => a.agentId === msg.speakerId)?.name 
        : undefined,
    }));
    
    setMessages(prev => [...prev, ...newMessages]);
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    sendMessageMutation.mutate({
      message: inputValue,
      agentId: targetAgent || selectedAgentId || undefined,
    });
  };

  const selectedAgent = agents.find(a => a.agentId === selectedAgentId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h2 className="text-lg font-medium text-gray-900">Chat Interface</h2>
        <p className="text-sm text-gray-600 mt-1">
          Communicate with agents in natural language
        </p>
      </div>

      {/* Target Agent Selection */}
      <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Agent (optional)
        </label>
        <select
          value={targetAgent}
          onChange={(e) => setTargetAgent(e.target.value)}
          className="form-input w-full"
        >
          <option value="">All agents</option>
          {agents.map(agent => (
            <option key={agent.agentId} value={agent.agentId}>
              {agent.name}
            </option>
          ))}
        </select>
        {selectedAgent && !targetAgent && (
          <p className="text-xs text-gray-500 mt-1">
            Will default to selected agent: {selectedAgent.name}
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Start a conversation with your agents!</p>
            <p className="text-sm mt-2">
              Type a message below to interact with agents in your world.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.type === 'agent' && message.agentName && (
                  <div className="text-xs font-medium text-gray-600 mb-1">
                    {message.agentName}
                  </div>
                )}
                <div className="text-sm">{message.content}</div>
                <div
                  className={`text-xs mt-1 ${
                    message.type === 'user' ? 'text-primary-200' : 'text-gray-500'
                  }`}
                >
                  {formatRelativeTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 form-input"
            disabled={sendMessageMutation.isPending}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || sendMessageMutation.isPending}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendMessageMutation.isPending ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}