import mongoose from 'mongoose';

// In-memory document storage fallback when MongoDB daemon is not running
class MemoryCollection {
  private docs: Map<string, any> = new Map();

  async find(query: any = {}) {
    return Array.from(this.docs.values()).filter(doc => this.matches(doc, query));
  }

  async findOne(query: any = {}) {
    const results = await this.find(query);
    return results[0] || null;
  }

  async findById(id: string) {
    return this.docs.get(id?.toString()) || null;
  }

  async create(doc: any) {
    const id = doc._id ? doc._id.toString() : new mongoose.Types.ObjectId().toString();
    const newDoc = {
      ...doc,
      _id: id,
      id: id,
      createdAt: doc.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.docs.set(id, newDoc);
    return newDoc;
  }

  async insertMany(docs: any[]) {
    const created = [];
    for (const d of docs) {
      created.push(await this.create(d));
    }
    return created;
  }

  async findByIdAndUpdate(id: string, update: any, options: any = {}) {
    const existing = await this.findById(id);
    if (!existing) return null;
    
    let updated = { ...existing };
    if (update.$set) {
      updated = { ...updated, ...update.$set };
    } else if (update.$inc) {
      for (const key of Object.keys(update.$inc)) {
        updated[key] = (updated[key] || 0) + update.$inc[key];
      }
    } else if (update.$push) {
      for (const key of Object.keys(update.$push)) {
        const arr = updated[key] || [];
        updated[key] = [...arr, update.$push[key]];
      }
    } else {
      updated = { ...updated, ...update };
    }
    updated.updatedAt = new Date();
    this.docs.set(id.toString(), updated);
    return options.new ? updated : existing;
  }

  async updateOne(query: any, update: any) {
    const item = await this.findOne(query);
    if (!item) return { modifiedCount: 0 };
    await this.findByIdAndUpdate(item._id.toString(), update);
    return { modifiedCount: 1 };
  }

  async deleteOne(query: any) {
    const item = await this.findOne(query);
    if (!item) return { deletedCount: 0 };
    this.docs.delete(item._id.toString());
    return { deletedCount: 1 };
  }

  async deleteMany(query: any = {}) {
    const items = await this.find(query);
    for (const item of items) {
      this.docs.delete(item._id.toString());
    }
    return { deletedCount: items.length };
  }

  async countDocuments(query: any = {}) {
    const items = await this.find(query);
    return items.length;
  }

  private matches(doc: any, query: any): boolean {
    for (const key of Object.keys(query)) {
      if (key === '$or' && Array.isArray(query.$or)) {
        const matched = query.$or.some((subQ: any) => this.matches(doc, subQ));
        if (!matched) return false;
        continue;
      }
      const val = query[key];
      if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        if ('$gte' in val && !(doc[key] >= val.$gte)) return false;
        if ('$lte' in val && !(doc[key] <= val.$lte)) return false;
        if ('$in' in val && (!Array.isArray(val.$in) || !val.$in.includes(doc[key]))) return false;
        if ('$ne' in val && doc[key] === val.$ne) return false;
      } else {
        const docVal = doc[key];
        const compareVal = val;
        if (docVal?.toString() !== compareVal?.toString()) {
          return false;
        }
      }
    }
    return true;
  }
}

export const memoryStore = {
  users: new MemoryCollection(),
  auctions: new MemoryCollection(),
  teams: new MemoryCollection(),
  players: new MemoryCollection(),
  bids: new MemoryCollection(),
};

let isConnected = false;
let isUsingMemoryStore = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/football_auction';
  
  try {
    // Attempt Mongoose connection with 1500ms timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 1500,
    });
    isConnected = true;
    isUsingMemoryStore = false;
    console.log(`[Database] Connected successfully to MongoDB at ${uri}`);
  } catch (err: any) {
    isConnected = true;
    isUsingMemoryStore = true;
    console.log(`[Database] MongoDB server not detected (${err.message}). Using seamless high-performance in-memory database store.`);
  }
}

export function isMemoryDbActive() {
  return isUsingMemoryStore;
}
