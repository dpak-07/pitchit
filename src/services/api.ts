const BASE_URL = '/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('football_auction_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // Auth
  async register(body: { name: string; email: string; password: string; role: string }) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse<{ token: string; user: any }>(res);
  },

  async login(body: { email: string; password: string }) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse<{ token: string; user: any }>(res);
  },

  async getMe() {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getHeaders(),
    });
    return handleResponse<{ user: any }>(res);
  },

  async logout() {
    return fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getHeaders(),
    });
  },

  // Auctions
  async createAuction(body: any) {
    const res = await fetch(`${BASE_URL}/auctions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<{ auction: any; roomCode: string; auctioneerCode?: string }>(res);
  },

  async getMyAuctions() {
    const res = await fetch(`${BASE_URL}/auctions/mine`, {
      headers: getHeaders(),
    });
    return handleResponse<{ auctions: any[] }>(res);
  },

  async getAuctionById(id: string, auctioneerCode?: string) {
    const query = auctioneerCode ? `?auctioneerCode=${encodeURIComponent(auctioneerCode)}` : '';
    const res = await fetch(`${BASE_URL}/auctions/${id}${query}`, {
      headers: getHeaders(),
    });
    return handleResponse<{
      auction: any;
      teams: any[];
      currentPlayer: any;
      bids: any[];
      stats: any;
      isHost: boolean;
    }>(res);
  },

  async updateAuction(id: string, body: any) {
    const res = await fetch(`${BASE_URL}/auctions/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<{ auction: any }>(res);
  },

  async deleteAuction(id: string) {
    const res = await fetch(`${BASE_URL}/auctions/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<{ message: string }>(res);
  },

  async joinAuction(body: { roomCode: string; teamName: string; color?: string; logo?: string }) {
    const res = await fetch(`${BASE_URL}/auctions/join`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<{ auction: any; team: any }>(res);
  },

  async startAuction(id: string, auctioneerCode?: string) {
    const res = await fetch(`${BASE_URL}/auctions/${id}/start`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        ...(auctioneerCode ? { 'x-auctioneer-code': auctioneerCode } : {}),
      },
      body: JSON.stringify({ auctioneerCode }),
    });
    return handleResponse<{ auction: any }>(res);
  },

  async pauseAuction(id: string) {
    const res = await fetch(`${BASE_URL}/auctions/${id}/pause`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<{ auction: any }>(res);
  },

  async resumeAuction(id: string) {
    const res = await fetch(`${BASE_URL}/auctions/${id}/resume`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<{ auction: any }>(res);
  },

  async skipPlayer(id: string) {
    const res = await fetch(`${BASE_URL}/auctions/${id}/skip`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<{ result: any }>(res);
  },

  async undoLastSale(id: string) {
    const res = await fetch(`${BASE_URL}/auctions/${id}/undo`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<{ result: any }>(res);
  },

  async manualSell(id: string, body: { unsold?: boolean; teamId?: string; amount?: number }) {
    const res = await fetch(`${BASE_URL}/auctions/${id}/manual-sell`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<{ result: any }>(res);
  },

  async endAuction(id: string) {
    const res = await fetch(`${BASE_URL}/auctions/${id}/end`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<{ auction: any }>(res);
  },

  async kickTeam(auctionId: string, teamId: string) {
    const res = await fetch(`${BASE_URL}/auctions/${auctionId}/teams/${teamId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<{ teams: any[] }>(res);
  },

  async getAuctionPlayers(id: string, query?: string) {
    const res = await fetch(`${BASE_URL}/auctions/${id}/players${query ? `?${query}` : ''}`, {
      headers: getHeaders(),
    });
    return handleResponse<{ players: any[]; count: number }>(res);
  },

  async addPlayers(id: string, players: any[]) {
    const res = await fetch(`${BASE_URL}/auctions/${id}/players`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ players }),
    });
    return handleResponse<{ count: number }>(res);
  },

  async resetSeedPlayers(id: string) {
    const res = await fetch(`${BASE_URL}/auctions/${id}/players/seed`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<{ count: number }>(res);
  },

  async getAuctionResults(id: string) {
    const res = await fetch(`${BASE_URL}/auctions/${id}/results`);
    return handleResponse<{
      auction: any;
      teams: any[];
      soldPlayers: any[];
      unsoldPlayers: any[];
      totalPlayers: number;
    }>(res);
  },

  async getMyTeams() {
    const res = await fetch(`${BASE_URL}/auctions/teams/my`, {
      headers: getHeaders(),
    });
    return handleResponse<{ teams: any[] }>(res);
  },
};
