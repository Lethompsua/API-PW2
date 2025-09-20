// models/PackType.js
import { Schema, model } from "mongoose";

const DropSchema = new Schema({
  rareza: { type: String, enum: ["common","uncommon","rare","legendary"], required: true },
  peso: { type: Number, required: true, min: 0 }
}, { _id: false });

const PackTypeSchema = new Schema({
  edicion:    { type: String, required: true },  // "WC-2026"
  nombre:       { type: String, required: true },  // "Sobre estándar"
  tamaño:       { type: Number, required: true, min: 1 },  // cromos por sobre
  precioMonedas: { type: Number, default: 0, min: 0 },
  precioGemas:  { type: Number, default: 0, min: 0 },
  drops:      { type: [DropSchema], required: true }      // pesos por rareza
}, { timestamps: true, versionKey: false });

PackTypeSchema.index({ edicion: 1, nombre: 1 }, { unique: true });

export default model("PackType", PackTypeSchema);
