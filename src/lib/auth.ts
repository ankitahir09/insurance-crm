import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import Admin from "@/models/Admin";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter both email and password");
        }

        await dbConnect();

        const admin = await Admin.findOne({
          email: credentials.email.toLowerCase(),
        });

        if (!admin) {
          throw new Error("Invalid email or password");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          admin.passwordHash,
        );

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: admin._id.toString(),
          email: admin.email,
          name: admin.name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
