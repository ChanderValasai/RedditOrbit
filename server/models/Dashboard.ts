import mongoose, { Schema, Types } from 'mongoose';
import { DashboardStreamSchema, IDashboardStream } from './DashboardStream';

export interface IDashboard {
  _id?: Types.ObjectId | string;
  name: string;
  userId: string;
  streams: IDashboardStream[];
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export const DashboardSchema = new Schema<IDashboard>(
  {
    name: {
      type: String,
      required: [true, 'Dashboard name is required'],
      trim: true,
      minlength: [1, 'Name must be at least 1 character'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
      trim: true,
    },
    streams: {
      type: [DashboardStreamSchema],
      default: [],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    bufferCommands: false,
    autoIndex: false,
  }
);

// Compound index for querying user dashboards efficiently
DashboardSchema.index({ userId: 1, createdAt: -1 });

export const Dashboard =
  mongoose.models.Dashboard ||
  mongoose.model<IDashboard>('Dashboard', DashboardSchema);
