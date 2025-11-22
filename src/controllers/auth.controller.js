import { OAuth2Client } from 'google-auth-library';
import User from '../../models/Usuario.js'; 
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Resend } from 'resend';


// 🟢 1. CONFIGURACIÓN DEL CLIENTE RESEND
const resend = new Resend(process.env.RESEND_API_KEY);


// --- REGISTRO ---
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

        res.status(201).json({
            msg: 'Usuario registrado exitosamente',
            user: { id: user._id, email: user.email, nombre: user.nombre }
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error del servidor');
    }
};



// --- LOGIN ---
export const login = async (req, res) => {
    const { email, password } = req.body; 

    try {
        const user = await User.findOne({
            $or: [{ email: email }, { nombre: email }]
        }).select('+password');

        if (!user) {
            return res.status(400).json({ msg: 'Credenciales inválidas.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ msg: 'Credenciales inválidas.' });
        }

        res.json({
            msg: 'Inicio de sesión exitoso',
            user: { id: user._id, email: user.email, nombre: user.nombre }
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error del servidor');
    }
};



// --- OLVIDAR CONTRASEÑA ---
export const forgotPassword = async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(200).json({ msg: "Si el email está registrado, recibirás un enlace." });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const tokenExpiration = Date.now() + 3600000;

    try {
        user.resetToken = resetToken;
        user.resetTokenExpires = tokenExpiration;
        await user.save();
    } catch (err) {
        console.error("Error al guardar token:", err);
        return res.status(500).json({ msg: "Error interno del servidor." });
    }

    const resetLink = `https://fifaalbum.vercel.app/pages/password-reset.html?token=${resetToken}`;

    const html = `
        <h2>Restablecimiento de Contraseña</h2>
        <p>Haz solicitado recuperar tu contraseña.</p>
        <p>Da clic aquí para continuar:</p>
        <a href="${resetLink}" style="color: #1abc9c;">CAMBIAR CONTRASEÑA</a>
        <p>Este enlace es válido por 1 hora.</p>
    `;

    try {
         const sendResult = await resend.emails.send({
        from: "Fanscore <onboarding@resend.dev>",
        to: user.email,
        subject: "Recuperación de Contraseña Fanscore",
        html
    });

        console.log("RESULTADO RESEND:", sendResult);
        console.log("API KEY:", process.env.RESEND_API_KEY);
        res.status(200).json({ msg: "Si el email está registrado, recibirás un enlace." });

    } catch (mailErr) {
        console.error("Error enviando email (Resend):", mailErr);
        res.status(200).json({ msg: "Si el email está registrado, recibirás un enlace." });
    }
};



// --- RESET PASSWORD ---
export const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ msg: "Datos inválidos o contraseña muy corta." });
    }

    try {
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ msg: "Enlace inválido o expirado." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        user.resetToken = undefined;
        user.resetTokenExpires = undefined;

        await user.save({ validateBeforeSave: false });

        res.status(200).json({ msg: "Contraseña actualizada con éxito." });

    } catch (error) {
        console.error("Error resetPassword:", error);
        res.status(500).json({ msg: "Error interno del servidor." });
    }
};
