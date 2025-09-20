// models/Sticker.js
import { Schema, model, Types } from "mongoose";

const StickerSchema = new Schema({
  edicion:  { type: String, required: true },          // ej. "WC-2026"
  numero:   { type: Number, required: true, min: 1 },  // número en el álbum
  tipo:     { type: String, enum: ["player","stadium","crest","other"], required: true },
  rareza:   { type: String, enum: ["common","uncommon","rare","legendary"], default: "common", index: true },

  // Para type = "player"
  playerId: { type: Types.ObjectId, ref: "Player" },

  // Para otros tipos (metadata ligera)
  titulo:    String,            // ejemplo: "Estadio Azteca" / "Escudo Argentina"
  equipo:     String             // útil para "crest"
}, { timestamps: true, versionKey: false });

StickerSchema.index({ edicion: 1, numero: 1 }, { unique: true });
StickerSchema.index({ edicion: 1, tipo: 1 });

export default model("Sticker", StickerSchema);
