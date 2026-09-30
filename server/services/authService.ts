import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/User';
import { UserPreferences } from '../models/UserPreferences';
import { Dashboard } from '../models/Dashboard';
import { isDatabaseConnected } from '../db/connection';
import { generateToken, AuthTokenPayload } from '../utils/jwt';
import { AppError } from '../types';

export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
  username?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface SanitizedUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  avatarUrl?: string;
  createdAt?: Date;
}

// In-memory fallback if Atlas is offline
interface MemoryUserRecord {
  id: string;
  username: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role: string;
  avatarUrl?: string;
  createdAt: Date;
}
const memoryUsers = new Map<string, MemoryUserRecord>();

export class AuthService {
  private validateEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      throw new AppError(400, 'INVALID_EMAIL', 'Email address is required.');
    }
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new AppError(400, 'INVALID_EMAIL', 'Please provide a valid email address.');
    }
    return cleanEmail;
  }

  private validatePassword(password: string): string {
    if (!password || typeof password !== 'string') {
      throw new AppError(400, 'INVALID_PASSWORD', 'Password is required.');
    }
    if (password.length < 6) {
      throw new AppError(400, 'INVALID_PASSWORD', 'Password must be at least 6 characters long.');
    }
    if (password.length > 128) {
      throw new AppError(400, 'INVALID_PASSWORD', 'Password cannot exceed 128 characters.');
    }
    return password;
  }

  private validateName(name: string): string {
    if (!name || typeof name !== 'string') {
      throw new AppError(400, 'INVALID_NAME', 'Name is required.');
    }
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      throw new AppError(400, 'INVALID_NAME', 'Name must be at least 2 characters long.');
    }
    if (cleanName.length > 50) {
      throw new AppError(400, 'INVALID_NAME', 'Name cannot exceed 50 characters.');
    }
    return cleanName;
  }

  private sanitizeUser(user: any): SanitizedUser {
    return {
      id: user._id ? user._id.toString() : user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role || 'user',
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }

  /**
   * Registers a new user with password hashing and duplicate checks
   */
  async register(data: RegisterDTO): Promise<{ user: SanitizedUser; token: string }> {
    const email = this.validateEmail(data.email);
    const password = this.validatePassword(data.password);
    const displayName = this.validateName(data.name);

    // Generate unique username from name/email if not provided
    let username = (data.username || email.split('@')[0] || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 20);
    if (username.length < 3) {
      username = `user_${Math.random().toString(36).slice(2, 8)}`;
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    if (isDatabaseConnected()) {
      // Check duplicate email in MongoDB Atlas
      const existingEmail = await User.findOne({ email }).lean();
      if (existingEmail) {
        throw new AppError(409, 'DUPLICATE_EMAIL', 'An account with this email address already exists.');
      }

      // Check unique username, adjust if necessary
      let finalUsername = username;
      const existingUser = await User.findOne({ username: finalUsername }).lean();
      if (existingUser) {
        finalUsername = `${username}_${Math.random().toString(36).slice(2, 6)}`;
      }

      const createdUser = await User.create({
        username: finalUsername,
        email,
        displayName,
        passwordHash,
        role: 'user',
        isActive: true,
        lastLoginAt: new Date(),
      });

      const userObj = createdUser.toObject();
      const sanitized = this.sanitizeUser(userObj);

      // Seed initial default dashboard for this new user in MongoDB Atlas
      try {
        await Dashboard.create({
          name: `${displayName}'s Orbital Deck`,
          userId: sanitized.id,
          isDefault: true,
          streams: [
            {
              subreddit: 'programming',
              position: 0,
              sort: 'hot',
              timeRange: 'day',
              postLimit: 25,
              collapsed: false,
            },
            {
              subreddit: 'technology',
              position: 1,
              sort: 'hot',
              timeRange: 'day',
              postLimit: 25,
              collapsed: false,
            },
          ],
        });

        // Seed initial preferences
        await UserPreferences.create({
          userId: sanitized.id,
          theme: 'dark',
          defaultSort: 'hot',
          autoRefreshIntervalSeconds: 60,
          compactMode: false,
          showNsfw: false,
        });
      } catch (err: any) {
        console.warn('[AUTH] Error initializing user default dashboard/prefs:', err.message);
      }

      const tokenPayload: AuthTokenPayload = {
        userId: sanitized.id,
        email: sanitized.email,
        username: sanitized.username,
        role: sanitized.role,
      };
      const token = generateToken(tokenPayload);

      return { user: sanitized, token };
    }

    // In-Memory Fallback
    for (const u of memoryUsers.values()) {
      if (u.email === email) {
        throw new AppError(409, 'DUPLICATE_EMAIL', 'An account with this email address already exists.');
      }
    }

    const memoryId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newMemoryUser: MemoryUserRecord = {
      id: memoryId,
      username,
      email,
      displayName,
      passwordHash,
      role: 'user',
      createdAt: new Date(),
    };
    memoryUsers.set(memoryId, newMemoryUser);

    const sanitized = this.sanitizeUser(newMemoryUser);
    const token = generateToken({
      userId: sanitized.id,
      email: sanitized.email,
      username: sanitized.username,
      role: sanitized.role,
    });

    return { user: sanitized, token };
  }

  /**
   * Authenticates user credentials and returns JWT
   */
  async login(data: LoginDTO): Promise<{ user: SanitizedUser; token: string }> {
    const email = this.validateEmail(data.email);
    if (!data.password || typeof data.password !== 'string') {
      throw new AppError(400, 'INVALID_PASSWORD', 'Password is required.');
    }

    if (isDatabaseConnected()) {
      // Must explicitly select +passwordHash because schema has select: false
      const userDoc = await User.findOne({ email }).select('+passwordHash');
      if (!userDoc || !userDoc.passwordHash) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
      }

      const isMatch = await bcrypt.compare(data.password, userDoc.passwordHash);
      if (!isMatch) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
      }

      userDoc.lastLoginAt = new Date();
      await userDoc.save();

      const userObj = userDoc.toObject();
      const sanitized = this.sanitizeUser(userObj);

      const token = generateToken({
        userId: sanitized.id,
        email: sanitized.email,
        username: sanitized.username,
        role: sanitized.role,
      });

      return { user: sanitized, token };
    }

    // In-Memory Fallback
    let foundUser: MemoryUserRecord | undefined;
    for (const u of memoryUsers.values()) {
      if (u.email === email) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(data.password, foundUser.passwordHash);
    if (!isMatch) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const sanitized = this.sanitizeUser(foundUser);
    const token = generateToken({
      userId: sanitized.id,
      email: sanitized.email,
      username: sanitized.username,
      role: sanitized.role,
    });

    return { user: sanitized, token };
  }

  /**
   * Retrieves sanitized profile of current authenticated user
   */
  async getCurrentUser(userId: string): Promise<SanitizedUser> {
    if (isDatabaseConnected()) {
      const userDoc = await User.findById(userId).lean();
      if (!userDoc) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User account not found.');
      }
      return this.sanitizeUser(userDoc);
    }

    const memUser = memoryUsers.get(userId);
    if (!memUser) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User account not found.');
    }
    return this.sanitizeUser(memUser);
  }
}

export const authService = new AuthService();
