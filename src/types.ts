export type UserRole = 'auctioneer' | 'player';
export type AuctionMode = 'live' | 'manual';
export type AuctionStatus = 'scheduled' | 'lobby' | 'live' | 'paused' | 'ended';
export type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'FWD';
export type PlayerStatus = 'pending' | 'sold' | 'unsold';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuctionConfig {
  purse: number;
  squadMin: number;
  squadMax: number;
  yearFrom: number;
  yearTo: number;
  basePrice: number;
  increment: number;
  timerSeconds: number;
  maxTeams: number;
}

export interface Auction {
  _id: string;
  hostId: string;
  name: string;
  mode: AuctionMode;
  status: AuctionStatus;
  roomCode: string;
  auctioneerCode?: string;
  scheduledAt: string;
  config: AuctionConfig;
  currentPlayerId?: string | null;
  currentBid: number;
  currentBidderId?: string | null;
  timerEndsAt?: string | null;
  paused: boolean;
  playerOrder: string[];
  lastSoldRecord?: {
    playerId: string;
    teamId: string;
    price: number;
  };
  teamsCount?: number;
  totalPlayersCount?: number;
  soldPlayersCount?: number;
  unsoldPlayersCount?: number;
}

export interface SquadMember {
  playerId: string;
  price: number;
  playerName?: string;
  position?: PlayerPosition;
  rating?: number;
}

export interface Team {
  _id: string;
  auctionId: string;
  ownerId: string;
  name: string;
  color?: string;
  logo?: string;
  purseLeft: number;
  squad: SquadMember[];
  totalSpent?: number;
}

export interface Player {
  _id: string;
  name: string;
  position: PlayerPosition;
  club: string;
  nationality: string;
  year: number;
  rating: number;
  basePrice: number;
  imageUrl: string;
  auctionId?: string;
  status: PlayerStatus;
  soldToTeamId?: string | null;
  soldPrice?: number | null;
}

export interface Bid {
  _id: string;
  auctionId: string;
  playerId: string;
  teamId: string;
  teamName?: string;
  amount: number;
  createdAt: string;
}
