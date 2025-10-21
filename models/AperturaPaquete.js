// models/PackOpening.js
import { Schema, model, Types } from "mongoose";

const ObtainedSchema = new Schema({
  stickerId: { type: Types.ObjectId, ref: "Sticker", required: true },
  duplicateBefore: { type: Boolean, default: false },
  placedNow: { type: Boolean, default: false }
}, { _id: false });

const PackOpeningSchema = new Schema({
  userId:     { type: Types.ObjectId, ref: "User", required: true, index: true },
  edicion:    { type: String, required: true },
  packTypeId: { type: Types.ObjectId, ref: "PackType", default: null },
  spent:      { coins: { type: Number, default: 0 }, gems: { type: Number, default: 0 } },
  items:      { type: [ObtainedSchema], required: true },
  openedAt:   { type: Date, default: () => new Date(), index: true }
}, { versionKey: false });

PackOpeningSchema.index({ userId: 1, openedAt: -1 });

export default model("PackOpening", PackOpeningSchema);
