import React from 'react';

interface HeaderProps {
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
}

export default function Header({ leftContent, rightContent }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="flex items-center gap-4">
        <div className="brand-title">GEN CODE LEAGUE</div>
        {leftContent}
      </div>
      <div className="flex items-center gap-4">
        {rightContent}
      </div>
    </header>
  );
}
