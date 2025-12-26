import { auth, currentUser } from "@clerk/nextjs/server";
import { query, queryOne } from "./db";

export interface DBUser {
  id: string;
  clerk_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  tier: "starter" | "pro" | "agency";
  queries_used: number;
  queries_limit: number;
  reset_date: Date;
  created_at: Date;
  updated_at: Date;
}

export async function getAuthUser(): Promise<DBUser | null> {
  const { userId } = await auth();
  
  if (!userId) {
    return null;
  }
  
  // Get user from database
  const user = await queryOne<DBUser>(
    `SELECT * FROM users WHERE clerk_id = $1`,
    [userId]
  );
  
  return user;
}

export async function getOrCreateUser(): Promise<DBUser | null> {
  const { userId } = await auth();
  
  if (!userId) {
    return null;
  }
  
  // Check if user exists
  let user = await queryOne<DBUser>(
    `SELECT * FROM users WHERE clerk_id = $1`,
    [userId]
  );
  
  if (!user) {
    // Get user info from Clerk
    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      return null;
    }
    
    // Create new user in database
    const result = await query<DBUser>(
      `INSERT INTO users (id, clerk_id, email, name, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        clerkUser.id,
        clerkUser.id,
        clerkUser.emailAddresses[0]?.emailAddress || "",
        `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
        clerkUser.imageUrl || null,
      ]
    );
    
    user = result[0];
  }
  
  return user;
}

export async function incrementQueryCount(userId: string): Promise<void> {
  await query(
    `UPDATE users SET queries_used = queries_used + 1, updated_at = now()
     WHERE id = $1`,
    [userId]
  );
}

export async function resetQueryCountIfNeeded(userId: string): Promise<void> {
  await query(
    `UPDATE users 
     SET queries_used = 0, 
         reset_date = date_trunc('month', now()) + interval '1 month',
         updated_at = now()
     WHERE id = $1 AND reset_date < now()`,
    [userId]
  );
}








