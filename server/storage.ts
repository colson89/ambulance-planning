import { users, type User, type InsertUser } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllShifts(): Promise<any[]>;
  createShift(shift: any): Promise<any>;
  updateUserPreferences(userId: number, preferences: { maxHours: number; preferredHours: number }): Promise<User>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private shifts: Map<number, any>;
  currentId: number;
  currentShiftId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.shifts = new Map();
    this.currentId = 1;
    this.currentShiftId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      isAdmin: insertUser.isAdmin || false,
      maxHours: insertUser.maxHours || 40,
      preferredHours: insertUser.preferredHours || 32
    };
    this.users.set(id, user);
    return user;
  }

  async getAllShifts(): Promise<any[]> {
    return Array.from(this.shifts.values());
  }

  async createShift(shift: any): Promise<any> {
    const id = this.currentShiftId++;
    const newShift = { ...shift, id };
    this.shifts.set(id, newShift);
    return newShift;
  }

  async updateUserPreferences(userId: number, preferences: { maxHours: number; preferredHours: number }): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const updatedUser = {
      ...user,
      maxHours: preferences.maxHours,
      preferredHours: preferences.preferredHours
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
}

export const storage = new MemStorage();