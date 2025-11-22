import { OAuth2Client } from 'google-auth-library';
// Importamos 'User' como 'default' (Usuario) y aseguramos la ruta:
import User from '../../models/Usuario.js'; 
import bcrypt from 'bcryptjs'; // Necesario para hashear contraseñas
import crypto from 'crypto'; // Necesario para generar tokens
import nodemailer from 'nodemailer'; // Necesario para enviar correos

// 🛑 1. CONFIGURACIÓN DEL EMAIL 🛑
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,              // <--- CAMBIO 1: Puerto desbloqueado
    secure: false,          // <--- CAMBIO 2: false para puerto 587
    auth: {
        user: 'sosajuarezjosemanuel15@gmail.com', 
        pass: 'vwku fwtm fqgy cspq' 
    },
    tls: {
        rejectUnauthorized: false // Opcional: Ayuda si hay líos con certificados en la nube
    }
});


// --- Controlador para REGISTRO (Crear cuenta) ---
export const register = async (req, res) => {
    const { email, password, nombre } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'El email ya está registrado.' });
        }

        user = new User({
            email,
            password, 
            nombre
        });

        await user.save({ validateBeforeSave: true });
        res.status(201).json({ msg: 'Usuario registrado exitosamente', user: { id: user._id, email: user.email, nombre: user.nombre } });

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error del servidor');
    }
};

// --- Controlador para INICIAR SESIÓN (Login) ---
// controllers/auth.controller.js

export const login = async (req, res) => {
    const { email, password } = req.body; 

    try {
        // 1. CARGAR USUARIO (Forzando la carga del hash)
        const user = await User.findOne({ 
            $or: [{ email: email }, { nombre: email }]
        }).select('+password'); // Asegura que el hash de la DB se cargue

        if (!user) {
            return res.status(400).json({ msg: 'Credenciales inválidas.' });
        }
        
        // 🛑 LÍNEA A MODIFICAR 🛑
        // ANTES: const isMatch = await user.comparePassword(password);
        
        // 1. Ahora, usamos la comparación directa de bcrypt (que es más segura aquí):
        const isMatch = await bcrypt.compare(password, user.password); // ⬅️ ¡USA ESTA LÍNEA!

        if (!isMatch) {
            return res.status(400).json({ msg: 'Credenciales inválidas.' });
        }

        // Éxito
        res.json({ msg: 'Inicio de sesión exitoso', user: { id: user._id, email: user.email, nombre: user.nombre } });

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error del servidor');
    }
};

// --- Controlador para OLVIDAR CONTRASEÑA (Endpoint 1) ---
export const forgotPassword = async (req, res) => {
    const { email } = req.body;

    // 1. BUSCAR USUARIO
    const user = await User.findOne({ email: email }); 
    if (!user) {
        // Mensaje de éxito/seguridad aunque no se encuentre el usuario
        return res.status(200).json({ msg: "Si el email está registrado, recibirás un enlace." });
    }

    // 2. GENERAR Y GUARDAR TOKEN SEGURO
    // Asegúrate de que tienes el paquete 'crypto' importado arriba
    const resetToken = crypto.randomBytes(20).toString('hex');
    const tokenExpiration = Date.now() + 3600000; // Expira en 1 hora (3600000 ms)

    try {
        // Asegúrate de que el modelo 'User' tenga los campos 'resetToken' y 'resetTokenExpires'
        user.resetToken = resetToken;
        user.resetTokenExpires = tokenExpiration;
        await user.save();
    } catch (dbError) {
        console.error("Error al guardar token en DB:", dbError);
        return res.status(500).json({ msg: "Error interno del servidor." });
    }
    
    // 3. CREAR ENLACE Y ENVIAR EMAIL
    // 🛑 AJUSTA ESTA URL a tu entorno real (puerto, dominio) 🛑
    const resetLink = `https://fifaalbum.vercel.app/pages/password-reset.html?token=${resetToken}`;


    const mailOptions = {
        to: user.email,
        from: 'sosajuarezjosemanuel15@gmail.com', // Debe coincidir con el 'user' de transporter
        subject: 'Recuperación de Contraseña Fanscore',
        html: `
            <h2>Restablecimiento de Contraseña</h2>
            <p>Hemos recibido una solicitud para restablecer la contraseña asociada a esta cuenta.</p>
            <p>Haz clic en el siguiente enlace para continuar:</p>
            <a href="${resetLink}" style="color: #1abc9c;">CAMBIAR CONTRASEÑA</a>
            <p>El enlace es válido por 1 hora. Si no solicitaste esto, ignora este correo.</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ msg: "Si el email está registrado, recibirás un enlace." });
    } catch (mailError) {
    console.error("Error al enviar el correo:", mailError);
    // 🚨 AQUÍ ESTÁ EL TRUCO:
    res.status(200).json({ msg: "Si el email está registrado, recibirás un enlace." });
}
};



export const resetPassword = async (req, res) => {
    // 🛑 1. Destructuring: Aseguramos que newPassword exista aquí.
    const { token, newPassword } = req.body; 

    // Validación mínima (Asegúrate de que newPassword tiene al menos 6 caracteres)
    if (!token || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ msg: "Faltan datos requeridos o la contraseña es muy corta." });
    }

    try {
        // 2. BUSCAR USUARIO POR TOKEN Y VERIFICAR EXPIRACIÓN
        const user = await User.findOne({ 
            resetToken: token,
            // $gt: greater than (mayor que) - verifica que el token NO haya expirado
            resetTokenExpires: { $gt: Date.now() } 
        });

        if (!user) {
            return res.status(400).json({ msg: "El enlace es inválido o ha expirado. Solicita uno nuevo." });
        }

        // 3. CIFRAR LA NUEVA CONTRASEÑA
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        console.log("HASH GENERADO:", hashedPassword);

        // 4. ACTUALIZAR LA BASE DE DATOS Y LIMPIAR EL TOKEN
        // Asignamos el hash cifrado:
        user.password = hashedPassword; 
        
        // Limpiamos los tokens de recuperación:
        user.resetToken = undefined; 
        user.resetTokenExpires = undefined; 

        // 🛑 GUARDADO CORREGIDO: Desactivamos el middleware pre('save') para evitar doble hash
        await user.save({ validateBeforeSave: false });

        // 5. RESPUESTA EXITOSA
        res.status(200).json({ msg: "Contraseña actualizada con éxito." });

    } catch (error) {
        console.error("Error en resetPassword:", error);
        res.status(500).json({ msg: "Error interno del servidor al restablecer la contraseña." });
    }
};

// 🛑 IMPORTANTE: Si usas Mongoose, debes asegurarte que cuando se guarda el
// usuario, la contraseña se hashea. Si no tienes un middleware para eso,
// debes asignar user.password = hashedPassword 