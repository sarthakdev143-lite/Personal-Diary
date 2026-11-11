import type { NextAuthOptions } from "next-auth";
import type { Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

import { safeEqualBase64 } from "./compare-secret";
import { normalizeEmail } from "./email";
import { findUserByEmail, upsertOAuthUser } from "./users";

function oauthProviders() {
    const providers: NextAuthOptions["providers"] = [];

    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        providers.push(GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }));
    }

    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
        providers.push(GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
        }));
    }

    return providers;
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Email",
            credentials: {
                email: { label: "Email", type: "email" },
                verifier: { label: "Verifier", type: "text" },
            },
            async authorize(credentials) {
                const email = normalizeEmail(credentials?.email ?? "");
                const verifier = credentials?.verifier ?? "";
                if (!email || !verifier) return null;

                const user = await findUserByEmail(email);
                if (!user?.authVerifier || !safeEqualBase64(user.authVerifier, verifier)) return null;

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    image: user.image ?? null,
                };
            },
        }),
        ...oauthProviders(),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === "credentials") return true;
            if ((account?.provider !== "google" && account?.provider !== "github") || !user.email) return false;
            await upsertOAuthUser({ email: user.email, name: user.name, image: user.image });
            return true;
        },
        async jwt({ token, user }) {
            const email = normalizeEmail(user?.email ?? token.email ?? "");
            if (email) {
                const row = await findUserByEmail(email);
                if (row) token.uid = row._id.toString();
            }
            return token;
        },
        async session({ session, token }): Promise<Session> {
            if (session.user) {
                session.user.id = token.uid ?? "";
            }
            return session;
        },
    },
};
