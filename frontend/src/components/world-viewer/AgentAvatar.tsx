'use client';

import { Agent } from '@/lib/types';
import { getInitials, generateAvatarColor } from '@/lib/utils';

interface AgentAvatarProps {
  agent: Agent;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export function AgentAvatar({ agent, size = 'md', onClick, className = '' }: AgentAvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const initials = getInitials(agent.name);
  const colorClass = generateAvatarColor(agent.name);

  return (
    <div
      className={`
        ${sizeClasses[size]} 
        ${colorClass} 
        rounded-full 
        flex 
        items-center 
        justify-center 
        text-white 
        font-medium 
        shadow-sm
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        ${className}
      `}
      onClick={onClick}
      title={agent.name}
    >
      {initials}
    </div>
  );
}