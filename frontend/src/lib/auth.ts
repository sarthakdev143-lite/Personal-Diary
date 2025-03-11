import { NextAuthOptions } from "next-auth";
import { AdapterUser } from "next-auth/adapters";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import { Session } from "next-auth";
import clientPromise from "@/lib/mongodb";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

interface ExtendedSession extends Session {
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
        id: string;
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        }),
    ],
    adapter: MongoDBAdapter(clientPromise),
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async session({ session, user }: { session: Session; user: AdapterUser }): Promise<ExtendedSession> {
            const extendedSession = session as ExtendedSession;

            if (extendedSession.user) {
                extendedSession.user.id = user.id;
            }

            return extendedSession;
        },
        async signIn({ account }) {
            if (account?.provider === "google" || account?.provider === "github") {
                return true; // Allow sign-in
            }
            return false; // Reject sign-in if needed
        }
    },
};
