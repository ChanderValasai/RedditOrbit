import mongoose, { Schema, Types } from 'mongoose';

export interface IDashboardStream {
  _id?: Types.ObjectId | string;
  subreddit: string;
  position: number;
  sort: 'hot' | 'new' | 'top' | 'rising';
  timeRange: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' | 'none';
  postLimit: number;
  collapsed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export const DashboardStreamSchema = new Schema<IDashboardStream>(
  {
    subreddit: {
      type: String,
      required: [true, 'Subreddit name is required'],
      trim: true,
      lowercase: true,
      match: [/^[a-zA-Z0-9_]{2,30}$/, 'Invalid subreddit format'],
    },
    position: {
      type: Number,
      default: 0,
      min: 0,
    },
    sort: {
      type: String,
      enum: {
        values: ['hot', 'new', 'top', 'rising'],
        message: '{VALUE} is not a valid sort option',
      },
      default: 'hot',
    },
    timeRange: {
      type: String,
      enum: {
        values: ['hour', 'day', 'week', 'month', 'year', 'all', 'none'],
        message: '{VALUE} is not a valid timeframe',
      },
      default: 'day',
    },
    postLimit: {
      type: Number,
      default: 25,
      min: [1, 'Minimum limit is 1'],
      max: [100, 'Maximum limit is 100'],
    },
    collapsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    _id: true,
    bufferCommands: false,
    autoIndex: false,
  }
);

export const DashboardStream =
  mongoose.models.DashboardStream ||
  mongoose.model<IDashboardStream>('DashboardStream', DashboardStreamSchema);
