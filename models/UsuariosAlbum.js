// models/UserSticker.js
import { Schema, model, Types } from "mongoose";

const UserStickerSchema = new Schema({
  userId:   { type: Types.ObjectId, ref: "User", required: true },
  stickerId:{ type: Types.ObjectId, ref: "Sticker", required: true, index: true },
  inAlbum:  { type: Boolean, default: false }, // pegado
  duplicates: { type: Number, default: 0, min: 0 },
  firstObtainedAt: Date,
  lastObtainedAt:  Date
}, { timestamps: true, versionKey: false });

UserStickerSchema.index({ userId: 1, stickerId: 1 }, { unique: true });

export default model("UserSticker", UserStickerSchema);
