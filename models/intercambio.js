// models/Intercambio.js
import { Schema, model, Types } from "mongoose";

const IntercambioSchema = new Schema({
  creadorId: { type: Types.ObjectId, ref: "User", required: true },
  
  // Stickers que el creador OFRECE (da)
  oferta: [{ type: Types.ObjectId, ref: "Sticker", required: true }],
  
  // Stickers que el creador BUSCA (pide)
  demanda: [{ type: Types.ObjectId, ref: "Sticker", required: true }],
  
  estado: { 
    type: String, 
    enum: ["ABIERTO", "COMPLETADO", "CANCELADO"], 
    default: "ABIERTO" 
  },
  
  // Quién aceptó el intercambio (para historial)
  completadoPorId: { type: Types.ObjectId, ref: "User" }

}, { timestamps: true, versionKey: false });

export default model("Intercambio", IntercambioSchema);