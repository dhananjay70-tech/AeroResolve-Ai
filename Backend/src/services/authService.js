const { eq } = require("drizzle-orm");
const { db, schema } = require("../db");
const { hashPassword, comparePassword } = require("../utils/password");
const { signToken } = require("../utils/jwt");
const { AppError } = require("../middleware/errorMiddleware");

function toSafeUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    createdAt: user.createdAt,
  };
}

async function register({ email, password, fullName }) {
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email));

  if (existing) {
    throw new AppError("Email is already registered", 409);
  }

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(schema.users)
    .values({ email, passwordHash, fullName })
    .returning();

  const token = signToken({ userId: user.id });

  return { user: toSafeUser(user), token };
}

async function login({ email, password }) {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email));

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isValid = await comparePassword(password, user.passwordHash);

  if (!isValid) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = signToken({ userId: user.id });

  return { user: toSafeUser(user), token };
}

async function getUserById(userId) {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId));

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return toSafeUser(user);
}

module.exports = { register, login, getUserById };
