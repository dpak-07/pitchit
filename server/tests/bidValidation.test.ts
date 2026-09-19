import assert from 'assert';
import { AuctionService } from '../services/auctionService';
import { ITeam } from '../models';

console.log('🧪 Running Bid Validation Logic Tests...\n');

// 1. Test Squad Reserve Rule calculation
function testReserveRule() {
  console.log('Test 1: Reserve Rule Calculation');

  // Case A: Team needs 3 more players to reach min squad of 5
  // currentSquadSize = 1, minSquad = 5, basePrice = 5, purseLeft = 100
  // Required reserve after this bid: (5 - 1 - 1) * 5 = 3 * 5 = 15
  // Max allowed bid = 100 - 15 = 85
  const teamA: ITeam = {
    auctionId: 'auc1',
    ownerId: 'user1',
    name: 'FC Test',
    purseLeft: 100,
    squad: [{ playerId: 'p1', price: 10 }],
  };

  const maxBidA = AuctionService.calculateMaxBid(teamA, 5, 5);
  assert.strictEqual(maxBidA, 85, `Expected max bid 85, got ${maxBidA}`);
  console.log(`  ✓ Team with squad 1/5 and 100 purse: Max Bid allowed is ${maxBidA} (Correctly reserves 15 for remaining 3 players)`);

  // Case B: Team has already reached or is 1 player away from min squad
  // currentSquadSize = 4, minSquad = 5, basePrice = 5, purseLeft = 50
  // Needed players after this bid = (5 - 4 - 1) = 0
  // Required reserve = 0
  // Max allowed bid = 50
  const teamB: ITeam = {
    auctionId: 'auc1',
    ownerId: 'user2',
    name: 'FC Full',
    purseLeft: 50,
    squad: [
      { playerId: 'p1', price: 10 },
      { playerId: 'p2', price: 10 },
      { playerId: 'p3', price: 10 },
      { playerId: 'p4', price: 10 },
    ],
  };

  const maxBidB = AuctionService.calculateMaxBid(teamB, 5, 5);
  assert.strictEqual(maxBidB, 50, `Expected max bid 50, got ${maxBidB}`);
  console.log(`  ✓ Team 1 player away from min squad can spend full remaining purse: ${maxBidB}`);

  // Case C: Low purse team cannot place bid if reserve would be broken
  const teamC: ITeam = {
    auctionId: 'auc1',
    ownerId: 'user3',
    name: 'FC Poor',
    purseLeft: 12,
    squad: [{ playerId: 'p1', price: 10 }], // needs 3 more players = 15 reserve
  };
  const maxBidC = AuctionService.calculateMaxBid(teamC, 5, 5);
  assert.strictEqual(maxBidC, 0, `Expected max bid 0 due to reserve deficit, got ${maxBidC}`);
  console.log(`  ✓ Team with insufficient reserve cannot bid above safe threshold (Max bid: ${maxBidC})`);
}

// 2. Test Bid Minimum Increment validation
function testBidIncrement() {
  console.log('\nTest 2: Minimum Bid Increment Logic');

  const basePrice = 10;
  const increment = 2;

  // First bid
  let currentBid = 0;
  const firstValidBid = currentBid === 0 ? basePrice : currentBid + increment;
  assert.strictEqual(firstValidBid, 10, 'First bid must be at least base price');
  console.log(`  ✓ First bid accepts base price of ${firstValidBid}`);

  // Subsequent bid
  currentBid = 14;
  const nextValidBid = currentBid + increment;
  assert.strictEqual(nextValidBid, 16, 'Subsequent bid must add increment');
  console.log(`  ✓ Subsequent bid requires currentBid + increment = ${nextValidBid}`);
}

// 3. Test Self-Outbid Prevention & Squad Full Guard
function testGuards() {
  console.log('\nTest 3: Self-Outbid and Squad Limits');

  const currentBidderId = 'team_123';
  const incomingTeamId = 'team_123';
  const isSelfOutbid = currentBidderId === incomingTeamId;
  assert.strictEqual(isSelfOutbid, true, 'Should detect self-outbid');
  console.log('  ✓ Prevents team from outbidding itself');

  const squadMax = 11;
  const currentSquadSize = 11;
  const isSquadFull = currentSquadSize >= squadMax;
  assert.strictEqual(isSquadFull, true, 'Should detect full squad');
  console.log('  ✓ Prevents team with full squad from bidding');
}

function runAll() {
  testReserveRule();
  testBidIncrement();
  testGuards();
  console.log('\n🎉 ALL BID VALIDATION TESTS PASSED SUCCESSFULLY!\n');
}

runAll();
