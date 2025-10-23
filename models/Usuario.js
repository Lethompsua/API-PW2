// Datos por usuario
// models/Usuario.js

import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs"; // Importa bcryptjs

const UserSchema = new Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // Añade el campo password
    nombre: { type: String, required: true, trim: true },
    oro: { type: Number, default: 100, min: 0 },
    gemas: { type: Number, default: 0, min: 0 },
}, { timestamps: true, versionKey: false });

// Middleware de Mongoose: Hashear la contraseña antes de guardarla
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) { // Solo hashear si la contraseña ha cambiado
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10); // Genera un 'salt' para el hashing
        this.password = await bcrypt.hash(this.password, salt); // Hashea la contraseña
        next();
    } catch (error) {
        next(error);
    }
});

// Método para comparar contraseñas (para el login)
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

export default model("User", UserSchema);