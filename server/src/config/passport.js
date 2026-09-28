import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { User } from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

const SERVER_URL = process.env.SERVER_URL || "";

// Account Linking Engine: Finds existing user by Provider ID or Email, or creates a new user.
async function findOrCreateSocialUser({ provider, providerId, email, name, avatar }) {
  const providerKey = `socialProfiles.${provider}Id`;

  // 1. Try finding user by Social Provider ID
  let user = await User.findOne({ [providerKey]: providerId });
  if (user) {
    if (avatar && !user.avatar) {
      user.avatar = avatar;
      await user.save();
    }
    return user;
  }

  // 2. Try finding user by Verified Email (Account Linking)
  if (email) {
    user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      if (!user.socialProfiles) user.socialProfiles = {};
      user.socialProfiles[`${provider}Id`] = providerId;
      if (avatar && !user.avatar) user.avatar = avatar;
      await user.save();
      return user;
    }
  }

  // 3. Create new user if no match found
  const fallbackEmail = email || `${provider}_${providerId}@social.user`;
  const newUser = await User.create({
    name: name || `${provider} User`,
    email: fallbackEmail.toLowerCase(),
    avatar,
    socialProfiles: {
      [`${provider}Id`]: providerId
    }
  });

  return newUser;
}

// --- 1. Google OAuth Strategy ---
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: SERVER_URL ? `${SERVER_URL}/api/user/google/callback` : "/api/user/google/callback"
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
          const user = await findOrCreateSocialUser({
            provider: "google",
            providerId: profile.id,
            email,
            name: profile.displayName,
            avatar
          });
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

// --- 2. GitHub OAuth Strategy ---
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: SERVER_URL ? `${SERVER_URL}/api/user/github/callback` : "/api/user/github/callback",
        scope: ["user:email"]
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
          const user = await findOrCreateSocialUser({
            provider: "github",
            providerId: profile.id,
            email,
            name: profile.displayName || profile.username,
            avatar
          });
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

// --- 3. LinkedIn OAuth Strategy ---
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  passport.use(
    new LinkedInStrategy(
      {
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: SERVER_URL ? `${SERVER_URL}/api/user/linkedin/callback` : "/api/user/linkedin/callback",
        scope: ["openid", "profile", "email"],
        state: false
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
          const user = await findOrCreateSocialUser({
            provider: "linkedin",
            providerId: profile.id,
            email,
            name: profile.displayName,
            avatar
          });
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

// --- 4. Facebook OAuth Strategy (Optional) ---
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: SERVER_URL ? `${SERVER_URL}/api/user/facebook/callback` : "/api/user/facebook/callback",
        profileFields: ["id", "displayName", "photos", "email"]
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
          const user = await findOrCreateSocialUser({
            provider: "facebook",
            providerId: profile.id,
            email,
            name: profile.displayName,
            avatar
          });
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

export default passport;
