import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db';
import { db } from '../models';
import { sampleFootballPlayers } from '../data/seedPlayers';
import { AuctionService } from '../services/auctionService';

export async function seedInitialData() {
  console.log('🌱 Checking / Seeding Football Player Auction database...');
  await connectDB();

  // Create default auctioneer host
  const salt = await bcrypt.genSalt(10);
  const hostPassword = await bcrypt.hash('admin123', salt);
  const playerPassword = await bcrypt.hash('player123', salt);

  let hostUser = await db.users.findOne({ email: 'host@auction.com' });
  if (!hostUser) {
    hostUser = await db.users.create({
      name: 'Premier Host (Alex)',
      email: 'host@auction.com',
      passwordHash: hostPassword,
      role: 'auctioneer',
    });
    console.log('✅ Created default host: host@auction.com / admin123');
  }

  // Create demo players / team owners
  const teamOwners = [
    { name: 'Marcus (Real Kings)', email: 'owner1@auction.com' },
    { name: 'Matteo (Catalan Stars)', email: 'owner2@auction.com' },
    { name: 'Lucas (London Gunners)', email: 'owner3@auction.com' },
    { name: 'Stefan (Bavaria United)', email: 'owner4@auction.com' },
  ];

  const createdOwners = [];
  for (const owner of teamOwners) {
    let u = await db.users.findOne({ email: owner.email });
    if (!u) {
      u = await db.users.create({
        name: owner.name,
        email: owner.email,
        passwordHash: playerPassword,
        role: 'player',
      });
      console.log(`✅ Created team owner: ${owner.email} / player123`);
    }
    createdOwners.push(u);
  }

  // Create a featured Live Auction
  const existingAuction = await db.auctions.findOne({ name: 'World Legends Premier Auction 2026' });
  if (!existingAuction) {
    const roomCode = 'LEAGUE';
    const auction = await db.auctions.create({
      hostId: hostUser._id.toString(),
      name: 'World Legends Premier Auction 2026',
      mode: 'live',
      status: 'lobby',
      roomCode,
      scheduledAt: new Date(),
      config: {
        purse: 120,
        squadMin: 5,
        squadMax: 11,
        yearFrom: 2010,
        yearTo: 2024,
        basePrice: 5,
        increment: 2,
        timerSeconds: 15,
        maxTeams: 8,
      },
      currentBid: 0,
      paused: false,
      playerOrder: [],
    });

    const auctionId = auction._id.toString();

    // Seed players into this auction
    const playerIds = [];
    for (const p of sampleFootballPlayers) {
      const createdPlayer = await db.players.create({
        ...p,
        auctionId,
        status: 'pending',
      });
      playerIds.push(createdPlayer._id.toString());
    }

    // Register initial teams
    const teamConfigs = [
      { name: 'Real Madrid CF', color: '#f59e0b', logo: '👑', owner: createdOwners[0] },
      { name: 'FC Barcelona', color: '#3b82f6', logo: '🔵', owner: createdOwners[1] },
      { name: 'Arsenal FC', color: '#ef4444', logo: '🔴', owner: createdOwners[2] },
      { name: 'Bayern Munich', color: '#dc2626', logo: '⚪', owner: createdOwners[3] },
    ];

    for (const tc of teamConfigs) {
      if (tc.owner) {
        await db.teams.create({
          auctionId,
          ownerId: tc.owner._id.toString(),
          name: tc.name,
          color: tc.color,
          logo: tc.logo,
          purseLeft: 120,
          squad: [],
        });
      }
    }

    await db.auctions.findByIdAndUpdate(auctionId, {
      playerOrder: playerIds,
      currentPlayerId: playerIds[0],
    });

    console.log(`✅ Created Live Auction with Room Code: ${roomCode} and ${playerIds.length} players!`);
  }

  // Create a featured Manual Auction
  const existingManual = await db.auctions.findOne({ name: 'Champions Classic (Manual Mode)' });
  if (!existingManual) {
    const roomCode = 'CHAMP1';
    const auctioneerCode = 'MANAGE';
    const auction = await db.auctions.create({
      hostId: hostUser._id.toString(),
      name: 'Champions Classic (Manual Mode)',
      mode: 'manual',
      status: 'lobby',
      roomCode,
      auctioneerCode,
      scheduledAt: new Date(),
      config: {
        purse: 100,
        squadMin: 4,
        squadMax: 8,
        yearFrom: 2012,
        yearTo: 2024,
        basePrice: 5,
        increment: 1,
        timerSeconds: 20,
        maxTeams: 6,
      },
      currentBid: 0,
      paused: false,
      playerOrder: [],
    });

    const auctionId = auction._id.toString();

    const playerIds = [];
    for (const p of sampleFootballPlayers.slice(0, 30)) {
      const created = await db.players.create({
        ...p,
        auctionId,
        status: 'pending',
      });
      playerIds.push(created._id.toString());
    }

    // Register 2 teams
    await db.teams.create({
      auctionId,
      ownerId: createdOwners[0]._id.toString(),
      name: 'Milan Rossoneri',
      color: '#ef4444',
      logo: '⭐',
      purseLeft: 100,
      squad: [],
    });

    await db.teams.create({
      auctionId,
      ownerId: createdOwners[1]._id.toString(),
      name: 'Inter Nerazzurri',
      color: '#2563eb',
      logo: '🐍',
      purseLeft: 100,
      squad: [],
    });

    await db.auctions.findByIdAndUpdate(auctionId, {
      playerOrder: playerIds,
      currentPlayerId: playerIds[0],
    });

    console.log(`✅ Created Manual Auction. Room Code: ${roomCode}, Auctioneer Code: ${auctioneerCode}`);
  }

  console.log('\n⚽ Seeding completed successfully!');
  console.log('Host Login: host@auction.com / admin123');
  console.log('Player Logins: owner1@auction.com, owner2@auction.com / player123');
  console.log('Live Room Code: LEAGUE');
  console.log('Manual Room Code: CHAMP1 (Auctioneer Code: MANAGE)');
}

// Run immediately if executed directly via CLI
if (process.argv[1]?.includes('seed.ts')) {
  seedInitialData().catch(err => {
    console.error('Seed Error:', err);
    process.exit(1);
  });
}
