import mongoose, { Schema, Document } from 'mongoose';
import { memoryStore, isMemoryDbActive } from '../config/db';

// ==================== INTERFACES ====================
export type UserRole = 'auctioneer' | 'player';
export type AuctionMode = 'live' | 'manual';
export type AuctionStatus = 'scheduled' | 'lobby' | 'live' | 'paused' | 'ended';
export type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'FWD';
export type PlayerStatus = 'pending' | 'sold' | 'unsold';

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt?: Date;
}

export interface IAuctionConfig {
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

export interface IAuction {
  _id?: string;
  hostId: string;
  name: string;
  mode: AuctionMode;
  status: AuctionStatus;
  roomCode: string;
  auctioneerCode?: string;
  scheduledAt: Date;
  config: IAuctionConfig;
  currentPlayerId?: string | null;
  currentBid: number;
  currentBidderId?: string | null;
  timerEndsAt?: Date | null;
  paused: boolean;
  playerOrder: string[];
  lastSoldRecord?: {
    playerId: string;
    teamId: string;
    price: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITeamSquadItem {
  playerId: string;
  price: number;
  playerName?: string;
  position?: PlayerPosition;
  rating?: number;
}

export interface ITeam {
  _id?: string;
  auctionId: string;
  ownerId: string;
  name: string;
  color?: string;
  logo?: string;
  purseLeft: number;
  squad: ITeamSquadItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPlayer {
  _id?: string;
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
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBid {
  _id?: string;
  auctionId: string;
  playerId: string;
  teamId: string;
  teamName?: string;
  amount: number;
  createdAt?: Date;
}

// ==================== MONGOOSE SCHEMAS ====================
const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['auctioneer', 'player'], required: true },
  createdAt: { type: Date, default: Date.now },
});

const AuctionConfigSchema = new Schema<IAuctionConfig>({
  purse: { type: Number, required: true, default: 100 },
  squadMin: { type: Number, required: true, default: 5 },
  squadMax: { type: Number, required: true, default: 11 },
  yearFrom: { type: Number, required: true, default: 2010 },
  yearTo: { type: Number, required: true, default: 2024 },
  basePrice: { type: Number, required: true, default: 5 },
  increment: { type: Number, required: true, default: 2 },
  timerSeconds: { type: Number, required: true, default: 15 },
  maxTeams: { type: Number, required: true, default: 8 },
}, { _id: false });

const AuctionSchema = new Schema<IAuction>({
  hostId: { type: String, required: true, ref: 'User' },
  name: { type: String, required: true },
  mode: { type: String, enum: ['live', 'manual'], required: true },
  status: { type: String, enum: ['scheduled', 'lobby', 'live', 'paused', 'ended'], default: 'scheduled' },
  roomCode: { type: String, required: true, unique: true, uppercase: true },
  auctioneerCode: { type: String, uppercase: true },
  scheduledAt: { type: Date, default: Date.now },
  config: { type: AuctionConfigSchema, required: true },
  currentPlayerId: { type: String, default: null },
  currentBid: { type: Number, default: 0 },
  currentBidderId: { type: String, default: null },
  timerEndsAt: { type: Date, default: null },
  paused: { type: Boolean, default: false },
  playerOrder: [{ type: String }],
  lastSoldRecord: {
    playerId: String,
    teamId: String,
    price: Number,
  },
}, { timestamps: true });

const TeamSchema = new Schema<ITeam>({
  auctionId: { type: String, required: true, ref: 'Auction' },
  ownerId: { type: String, required: true, ref: 'User' },
  name: { type: String, required: true },
  color: { type: String, default: '#10b981' },
  logo: { type: String, default: '⚽' },
  purseLeft: { type: Number, required: true },
  squad: [{
    playerId: { type: String, required: true },
    price: { type: Number, required: true },
    playerName: String,
    position: String,
    rating: Number,
  }],
}, { timestamps: true });

const PlayerSchema = new Schema<IPlayer>({
  name: { type: String, required: true },
  position: { type: String, enum: ['GK', 'DEF', 'MID', 'FWD'], required: true },
  club: { type: String, required: true },
  nationality: { type: String, required: true },
  year: { type: Number, required: true },
  rating: { type: Number, required: true },
  basePrice: { type: Number, required: true },
  imageUrl: { type: String, required: true },
  auctionId: { type: String, default: null },
  status: { type: String, enum: ['pending', 'sold', 'unsold'], default: 'pending' },
  soldToTeamId: { type: String, default: null },
  soldPrice: { type: Number, default: null },
}, { timestamps: true });

const BidSchema = new Schema<IBid>({
  auctionId: { type: String, required: true, ref: 'Auction' },
  playerId: { type: String, required: true, ref: 'Player' },
  teamId: { type: String, required: true, ref: 'Team' },
  teamName: { type: String },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Create Mongoose models (safe if already compiled)
export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const AuctionModel = mongoose.models.Auction || mongoose.model<IAuction>('Auction', AuctionSchema);
export const TeamModel = mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);
export const PlayerModel = mongoose.models.Player || mongoose.model<IPlayer>('Player', PlayerSchema);
export const BidModel = mongoose.models.Bid || mongoose.model<IBid>('Bid', BidSchema);

// ==================== UNIFIED REPOSITORY WRAPPERS ====================
// These allow the app to work seamlessly whether connected to a real MongoDB
// instance or falling back to the in-memory persistence store.

export const db = {
  users: {
    find: async (query: any = {}) => isMemoryDbActive() ? memoryStore.users.find(query) : UserModel.find(query).lean(),
    findOne: async (query: any) => isMemoryDbActive() ? memoryStore.users.findOne(query) : UserModel.findOne(query).lean(),
    findById: async (id: string) => isMemoryDbActive() ? memoryStore.users.findById(id) : UserModel.findById(id).lean(),
    create: async (data: Partial<IUser>) => isMemoryDbActive() ? memoryStore.users.create(data) : UserModel.create(data),
    count: async (query: any = {}) => isMemoryDbActive() ? memoryStore.users.countDocuments(query) : UserModel.countDocuments(query),
  },
  auctions: {
    find: async (query: any = {}) => isMemoryDbActive() ? memoryStore.auctions.find(query) : AuctionModel.find(query).sort({ scheduledAt: -1 }).lean(),
    findOne: async (query: any) => isMemoryDbActive() ? memoryStore.auctions.findOne(query) : AuctionModel.findOne(query).lean(),
    findById: async (id: string) => isMemoryDbActive() ? memoryStore.auctions.findById(id) : AuctionModel.findById(id).lean(),
    create: async (data: Partial<IAuction>) => isMemoryDbActive() ? memoryStore.auctions.create(data) : AuctionModel.create(data),
    findByIdAndUpdate: async (id: string, update: any, options: any = { new: true }) => {
      if (isMemoryDbActive()) {
        return memoryStore.auctions.findByIdAndUpdate(id, update, options);
      }
      return AuctionModel.findByIdAndUpdate(id, update, options).lean();
    },
    deleteOne: async (id: string) => isMemoryDbActive() ? memoryStore.auctions.deleteOne({ _id: id }) : AuctionModel.findByIdAndDelete(id),
  },
  teams: {
    find: async (query: any = {}) => isMemoryDbActive() ? memoryStore.teams.find(query) : TeamModel.find(query).lean(),
    findOne: async (query: any) => isMemoryDbActive() ? memoryStore.teams.findOne(query) : TeamModel.findOne(query).lean(),
    findById: async (id: string) => isMemoryDbActive() ? memoryStore.teams.findById(id) : TeamModel.findById(id).lean(),
    create: async (data: Partial<ITeam>) => isMemoryDbActive() ? memoryStore.teams.create(data) : TeamModel.create(data),
    findByIdAndUpdate: async (id: string, update: any, options: any = { new: true }) => {
      if (isMemoryDbActive()) {
        return memoryStore.teams.findByIdAndUpdate(id, update, options);
      }
      return TeamModel.findByIdAndUpdate(id, update, options).lean();
    },
    deleteOne: async (id: string) => isMemoryDbActive() ? memoryStore.teams.deleteOne({ _id: id }) : TeamModel.findByIdAndDelete(id),
    deleteMany: async (query: any) => isMemoryDbActive() ? memoryStore.teams.deleteMany(query) : TeamModel.deleteMany(query),
  },
  players: {
    find: async (query: any = {}) => isMemoryDbActive() ? memoryStore.players.find(query) : PlayerModel.find(query).lean(),
    findOne: async (query: any) => isMemoryDbActive() ? memoryStore.players.findOne(query) : PlayerModel.findOne(query).lean(),
    findById: async (id: string) => isMemoryDbActive() ? memoryStore.players.findById(id) : PlayerModel.findById(id).lean(),
    create: async (data: Partial<IPlayer>) => isMemoryDbActive() ? memoryStore.players.create(data) : PlayerModel.create(data),
    insertMany: async (items: Partial<IPlayer>[]) => isMemoryDbActive() ? memoryStore.players.insertMany(items) : PlayerModel.insertMany(items),
    findByIdAndUpdate: async (id: string, update: any, options: any = { new: true }) => {
      if (isMemoryDbActive()) {
        return memoryStore.players.findByIdAndUpdate(id, update, options);
      }
      return PlayerModel.findByIdAndUpdate(id, update, options).lean();
    },
    deleteMany: async (query: any) => isMemoryDbActive() ? memoryStore.players.deleteMany(query) : PlayerModel.deleteMany(query),
    count: async (query: any = {}) => isMemoryDbActive() ? memoryStore.players.countDocuments(query) : PlayerModel.countDocuments(query),
  },
  bids: {
    find: async (query: any = {}) => isMemoryDbActive() ? memoryStore.bids.find(query) : BidModel.find(query).sort({ createdAt: -1 }).lean(),
    create: async (data: Partial<IBid>) => isMemoryDbActive() ? memoryStore.bids.create(data) : BidModel.create(data),
    deleteMany: async (query: any) => isMemoryDbActive() ? memoryStore.bids.deleteMany(query) : BidModel.deleteMany(query),
  },
};
