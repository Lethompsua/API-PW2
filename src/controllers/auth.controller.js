// src/controllers/auth.controller.js
import { OAuth2Client } from 'google-auth-library';
import User from '../../models/Usuario.js'; // Asegúrate de que la ruta sea correcta

// --- Controlador para REGISTRO (Crear cuenta) ---
export const register = async (req, res) => {
    const { email, password, nombre } = req.body;

    try {
        // 1. Verificar si el usuario ya existe
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'El email ya está registrado.' });
        }

        // 2. Crear un nuevo usuario usando el modelo de Mongoose
        user = new User({
            email,
            password, // La contraseña se hasheará automáticamente gracias al middleware en el modelo
            nombre
        });

        // 3. Guardar el usuario en la base de datos
        await user.save();

        // 4. Respuesta exitosa (puedes enviar el usuario sin la contraseña)
        res.status(201).json({ msg: 'Usuario registrado exitosamente', user: { id: user._id, email: user.email, nombre: user.nombre } });

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error del servidor');
    }
};

// --- Controlador para INICIAR SESIÓN (Login) ---
export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Verificar si el usuario existe
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Credenciales inválidas.' });
        }

        // 2. Comparar la contraseña proporcionada con la hasheada en la DB
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Credenciales inválidas.' });
        }

        // 3. Si las credenciales son correctas, el usuario ha iniciado sesión
        //    Aquí podrías generar un token JWT para la sesión, pero por ahora solo confirmamos.
        res.json({ msg: 'Inicio de sesión exitoso', user: { id: user._id, email: user.email, nombre: user.nombre } });

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error del servidor');
    }
};
export const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            // 🛑 CRÍTICO: Por seguridad, no decimos si el email existe o no. 🛑
            return res.json({ msg: 'Si el correo existe, recibirás un enlace de recuperación.' });
        }

        // 🛑 Lógica real de generación de token de restablecimiento 🛑
        
        // Aquí iría el código para generar un token único y guardarlo en la DB
        // y luego, enviar un email al usuario con el enlace:
        // const resetToken = user.generatePasswordResetToken();
        // await user.save();
        // await sendRecoveryEmail(user.email, resetToken);
        
        // Simulación:
        console.log(`[RECOVERY] Solicitud de cambio para: ${email}. Simulación de envío de token.`);

        // 3. Respuesta (siempre positiva para evitar ataques de enumeración de usuarios)
        res.json({ msg: 'Si el correo existe, se ha enviado un enlace para restablecer la contraseña.' });

    } catch (error) {
        console.error('Error en forgotPassword:', error);
        res.status(500).json({ msg: 'Error interno del servidor al procesar la solicitud.' });
    }
    };