const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UserModel = require('../models/user.model');
const {getPostData} = require('../utils/helpers');
const { sendMail } = require('../services/email.service');
const bcrypt = require('bcryptjs');

function getAppBaseUrl(req) {
    return process.env.APP_BASE_URL || `http://${req.headers.host}`;
}

function makeToken() {
    return crypto.randomBytes(32).toString('hex');
}

async function registerUser(req, res) {
    try {
        const body = await getPostData(req);
        const { first_name, last_name, email, password, phone } = body;
        console.log('Registration attempt:', { first_name, last_name, email, phone });

        if ( !first_name || !last_name || !email || !password) {
            console.log('Missing required fields');
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ message: 'All fields are require' }));
        }

        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            console.log('Email already exists:', email);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ message: 'Email already exists' }));
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const activationToken = makeToken();
        const activationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const newUserId = await UserModel.create({
            first_name,
            last_name,
            email,
            password_hash,
            phone: phone || null, 
            activation_token: activationToken,
            activation_expires: activationExpires
        });
        console.log('User created with ID:', newUserId);
        const activationUrl = `${getAppBaseUrl(req)}/api/auth/activate?token=${activationToken}`;
        await sendMail({
            to: email,
            subject: 'Activate your Spider Store account',
            text: `Open this link within 24 hours to activate your account: ${activationUrl}`
        });

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: true,
            message: 'Account created. Please activate your email before login.',
            userId: newUserId,
            activationUrl,
            user: {
                id: newUserId,
                first_name: first_name,
                email: email,
                role: 'user'
            }
        }));

    } catch (error) {
        console.error('Error registering user:', error);

        if (error.code === 'INVALID_JSON') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ message: 'Invalid JSON payload' }));
        }

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Server error' }));
    }   
}
async function loginUser(req, res) {
    try {
        const body = await getPostData(req);
        const { email, password } = body;

        if (!email || !password) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Please enter your email address and password.' }));
        }

        const user = await UserModel.findByEmail(email);
        if (!user) {

            res.writeHead(401, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Invalid email or password.' }));
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordMatch) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Invalid email or password.' }));
        }

        if (Number(user.email_verified) !== 1) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Please activate your email before login.' }));
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role === 'customer' ? 'user' : user.role }, 
            process.env.JWT_SECRET || 'fallback_secret_key', 
            { expiresIn: '30d' } 
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                first_name: user.first_name,
                email: user.email,
                role: user.role === 'customer' ? 'user' : user.role,
                seller_status: user.seller_status || 'pending'
            }
        }));

    } catch (error) {
        console.error(error);

        if (error.code === 'INVALID_JSON') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Invalid JSON payload' }));
        }

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'حدث خطأ في السيرفر' }));
    }
}

async function activateEmail(req, res) {
    try {
        const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
        const token = parsedUrl.searchParams.get('token');
        if (!token) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Activation token is required' }));
        }

        const user = await UserModel.findByActivationToken(token);
        if (!user || !user.activation_expires || new Date(user.activation_expires) < new Date()) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Activation link is invalid or expired' }));
        }

        await UserModel.activate(user.id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Email activated successfully. You can login now.' }));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Server error' }));
    }
}

async function forgotPassword(req, res) {
    try {
        const { email } = await getPostData(req);
        if (!email) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Email is required' }));
        }

        const user = await UserModel.findByEmail(email);
        if (user) {
            const resetToken = makeToken();
            const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            await UserModel.setResetToken(user.id, resetToken, resetExpires);
            const resetUrl = `${getAppBaseUrl(req)}/frontend/pages/auth/reset-password.html?token=${resetToken}`;
            await sendMail({
                to: email,
                subject: 'Reset your Spider Store password',
                text: `Open this link within 1 hour to reset your password: ${resetUrl}`
            });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'If this email exists, a reset link has been sent.' }));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Server error' }));
    }
}

async function resetPassword(req, res) {
    try {
        const { token, password } = await getPostData(req);
        if (!token || !password || String(password).length < 6) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Valid token and password are required' }));
        }

        const user = await UserModel.findByResetToken(token);
        if (!user || !user.reset_expires || new Date(user.reset_expires) < new Date()) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Reset link is invalid or expired' }));
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await UserModel.updatePassword(user.id, passwordHash);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Password updated successfully.' }));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Server error' }));
    }
}

module.exports = {
    registerUser,
    loginUser,
    activateEmail,
    forgotPassword,
    resetPassword
};
