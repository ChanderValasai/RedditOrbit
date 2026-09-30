import mongoose, { Schema, Types } from 'mongoose';

export interface IUserPreferences {
  _id?: Types.ObjectId | string;
  userId: string;
  theme: 'dark' | 'light' | 'system';
  defaultSort: 'hot' | 'new' | 'top' | 'rising';
  autoRefreshIntervalSeconds: number;
  compactMode: boolean;
  showNsfw: boolean;
  activeDashboardId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const UserPreferencesSchema = new Schema<IUserPreferences>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
      trim: true,
    },
    theme: {
      type: String,
      enum: ['dark', 'light', 'system'],
      default: 'dark',
    },
    defaultSort: {
      type: String,
      enum: ['hot', 'new', 'top', 'rising'],
      default: 'hot',
    },
    autoRefreshIntervalSeconds: {
      type: Number,
      default: 60,
      min: [10, 'Minimum refresh interval is 10 seconds'],
      max: [3600, 'Maximum refresh interval is 3600 seconds'],
    },
    compactMode: {
      type: Boolean,
      default: false,
    },
    showNsfw: {
      type: Boolean,
      default: false,
    },
    activeDashboardId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    bufferCommands: false,
    autoIndex: false,
  }
);

export const UserPreferences =
  mongoose.models.UserPreferences ||
  mongoose.model<IUserPreferences>('UserPreferences', UserPreferencesSchema);
