import React from 'react';
import { Player, Position } from '../types';
import { User, Activity, DollarSign, Shield, Zap } from 'lucide-react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline' }> = ({ children, className, variant = 'primary', ...props }) => {
  const baseStyle = "px-4 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/50",
    secondary: "bg-slate-700 hover:bg-slate-600 text-white",
    danger: "bg-red-600 hover:bg-red-500 text-white",
    outline: "border-2 border-slate-600 text-slate-300 hover:border-slate-400"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = "", title }) => (
  <div className={`bg-slate-800 rounded-2xl p-4 border border-slate-700/50 ${className}`}>
    {title && <h3 className="text-slate-400 text-sm uppercase tracking-wider font-bold mb-3">{title}</h3>}
    {children}
  </div>
);

export const PlayerCard: React.FC<{ player: Player; compact?: boolean; onClick?: () => void }> = ({ player, compact, onClick }) => {
  const getPosColor = (p: Position) => {
    switch(p) {
      case Position.ATT: return 'text-red-400';
      case Position.MID: return 'text-green-400';
      case Position.DEF: return 'text-blue-400';
      case Position.GK: return 'text-yellow-400';
    }
  };

  if (compact) {
    return (
      <div onClick={onClick} className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold bg-slate-800 border border-slate-600 ${getPosColor(player.position)}`}>
            {player.position[0]}
          </div>
          <div>
            <p className="font-bold text-sm text-slate-200">{player.name}</p>
            <p className="text-xs text-slate-400">{player.age} yo</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-display font-bold text-white">{player.overall}</p>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClick} className="relative group cursor-pointer">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-slate-900 rounded-xl transform rotate-1 group-hover:rotate-2 transition-transform opacity-50"></div>
      <div className="relative bg-slate-800 p-4 rounded-xl border border-slate-600 overflow-hidden">
        <div className="flex justify-between items-start mb-2">
           <div className="flex flex-col">
              <span className="text-3xl font-display font-bold text-white">{player.overall}</span>
              <span className={`text-xs font-bold ${getPosColor(player.position)}`}>{player.position}</span>
           </div>
           <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
             <User className="text-slate-400 w-6 h-6" />
           </div>
        </div>
        <div className="mb-3">
          <p className="font-bold text-lg truncate text-white">{player.name}</p>
          <div className="flex gap-2 text-xs text-slate-400">
             <span>Energy: {player.energy}%</span>
             <span>Morale: {player.morale}%</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs text-slate-300 font-mono">
           <div className="flex justify-between"><span>PAC</span> <span className="text-white font-bold">{player.stats.pac}</span></div>
           <div className="flex justify-between"><span>DRI</span> <span className="text-white font-bold">{player.stats.dri}</span></div>
           <div className="flex justify-between"><span>SHO</span> <span className="text-white font-bold">{player.stats.sho}</span></div>
           <div className="flex justify-between"><span>DEF</span> <span className="text-white font-bold">{player.stats.def}</span></div>
           <div className="flex justify-between"><span>PAS</span> <span className="text-white font-bold">{player.stats.pas}</span></div>
           <div className="flex justify-between"><span>PHY</span> <span className="text-white font-bold">{player.stats.phy}</span></div>
        </div>
      </div>
    </div>
  );
};

export const Header: React.FC<{ title: string; subtitle?: string; rightAction?: React.ReactNode }> = ({ title, subtitle, rightAction }) => (
  <div className="flex items-center justify-between mb-6">
    <div>
      <h1 className="text-2xl md:text-3xl font-display font-bold text-white uppercase tracking-tight">{title}</h1>
      {subtitle && <p className="text-slate-400 text-sm">{subtitle}</p>}
    </div>
    {rightAction}
  </div>
);

export const MoneyDisplay: React.FC<{ amount: number }> = ({ amount }) => (
  <span className="font-mono text-green-400 font-bold flex items-center gap-1">
    <DollarSign size={14} />
    {(amount / 1000000).toFixed(1)}M
  </span>
);
