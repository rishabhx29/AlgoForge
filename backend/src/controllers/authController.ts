import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/env';

const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

// Generate JWT
const generateToken = (id: string) => {
    return jwt.sign({ id }, config.JWT_SECRET!, { expiresIn: '30d' });
};

// @desc    Register new user
// @route   POST /api/users
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({ message: 'Please add all fields' });
            return;
        }

        const userExists = await prisma.user.findUnique({ where: { email } });

        if (userExists) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword
            }
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id),
                xp_points: user.xp_points,
                streak_days: user.streak_days,
                solvedProblems: user.solvedProblems,
                bookmarks: user.bookmarks,
                activityLog: user.activityLog
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    }
    catch (error: any) {
        console.error('Register Error:', error);

        res.status(500).json({
            success: false,
            message: error.message ||'Internal server error'
        });
    }
};

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });

        if (user && user.password && (await bcrypt.compare(password, user.password))) {
            if (user.isBanned) {
                res.status(403).json({ message: 'Your account has been suspended' });
                return;
            }
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id),
                xp_points: user.xp_points,
                streak_days: user.streak_days,
                solvedProblems: user.solvedProblems,
                bookmarks: user.bookmarks,
                activityLog: user.activityLog
            });
        } else {
            res.status(400).json({ message: 'Invalid credentials' });
        }
    } catch (error: any) {
        console.error('Login Error:', error);

        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// @desc    Google Auth
// @route   POST /api/users/google
// @access  Public
export const googleAuth = async (req: Request, res: Response) => {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: config.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
            res.status(400).json({ message: 'Invalid Google Token' });
            return;
        }

        const { email, name, sub: googleId, picture: avatar } = payload;

        let user = await prisma.user.findUnique({ where: { email } });
        let isNewUser = false;

        if (user) {
            if (!user.googleId) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { googleId }
                });
            }
        } else {
            isNewUser = true;
            user = await prisma.user.create({
                data: {
                    name: name || 'Google User',
                    email,
                    googleId,
                    avatar,
                    password: ''
                }
            });
        }

        res.status(200).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id),
            xp_points: user.xp_points,
            streak_days: user.streak_days,
            solvedProblems: user.solvedProblems,
            bookmarks: user.bookmarks,
            activityLog: user.activityLog,
            isNewUser
        });

    } catch (error) {
        console.error('Google Auth Error:', error);

        // Invalid/failed Google token verification is a client error (400),
        // not a server error — e.g. expired, malformed, or wrongly-audience ID token.
        res.status(400).json({
            message: 'Google Auth Failed'
        });
    }
};

// @desc    Get user data
// @route   GET /api/users/me
// @access  Private
export const getMe = async (req: Request, res: Response) => {
    res.status(200).json(req.user);
};