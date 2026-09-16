import dotenv from "dotenv";
dotenv.config();

const requiredEnv = [
    "PORT",
    "MONGO_URI",
    "JWT_SECRET",
    "GOOGLE_CLIENT_ID",
    "CLIENT_URL",
    "GEMINI_API_KEY"
]

requiredEnv.forEach((key) => {
    if(!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
})

// ── Secret hardening ─────────────────────────────────────────
// JWT_SECRET must be cryptographically strong (>= 32 chars ≈ 256 bits) and must
// never be confused with the Google OAuth client ID (e.g. pasted into the wrong
// env slot). Fail fast at startup rather than issuing forgeable tokens.
const jwtSecret = process.env.JWT_SECRET || '';
if (jwtSecret.length < 32) {
    throw new Error(
        'JWT_SECRET must be at least 32 characters long (got ' +
            jwtSecret.length +
            '). Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
}
if (process.env.JWT_SECRET === process.env.GOOGLE_CLIENT_ID) {
    throw new Error(
        'JWT_SECRET must not equal GOOGLE_CLIENT_ID — the wrong value was likely set in one of the two variables.'
    );
}

export const config = {
    PORT: process.env.PORT,
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    CLIENT_URL: process.env.CLIENT_URL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY
}