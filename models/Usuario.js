// Datos por usuario
import { Schema, model } from "mongoose";

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  nombre:  { type: String, required: true, trim: true },
  oro: { type: Number, default: 100, min: 0 },
  gemas:  { type: Number, default: 0, min: 0 }
}, { timestamps: true, versionKey: false });

export default model("User", UserSchema);
