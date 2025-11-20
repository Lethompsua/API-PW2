// Datos por usuario
import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs"; 

const UserSchema = new Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    nombre: { type: String, required: true, trim: true }, // Almacena el nombre completo
    oro: { type: Number, default: 100, min: 0 },
    gemas: { type: Number, default: 0, min: 0 },
    sobres: { type: Number, default: 5, min: 0 },
    // <<<< 🛑 NUEVOS CAMPOS AÑADIDOS PARA EL PERFIL 🛑 >>>>
    // Se inicializan como opcionales:
    birthDate: { type: Date, default: null }, // Mongoose requiere el formato ISO: YYYY-MM-DD
    bio: { type: String, default: 'Coleccionista de cromos.', maxlength: 300 },
    favoriteTeam: { type: String, default: 'No especificado' },
    // El campo 'avatar' para la URL de la foto de perfil:
    avatar: { type: String, default: 'https://i.pinimg.com/736x/22/20/56/2220563187a6e72782c5e9ead2287ec5.jpg' }, 
    // <<<< FIN NUEVOS CAMPOS >>>>

}, { timestamps: true, versionKey: false });

// Middleware de Mongoose: Hashear la contraseña antes de guardarla
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) { 
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10); 
        this.password = await bcrypt.hash(this.password, salt); 
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