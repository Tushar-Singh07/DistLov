import argon2 from 'argon2';
import bcrypt from 'bcryptjs';

export const hashPassword = async (password: string): Promise<string> => {
  try {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  } catch (error) {
    // Fallback to bcrypt if argon2 native module encounters issues
    const salt = await bcrypt.genSalt(12);
    return await bcrypt.hash(password, salt);
  }
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    if (hash.startsWith('$argon2')) {
      return await argon2.verify(hash, password);
    }
    return await bcrypt.compare(password, hash);
  } catch (error) {
    return false;
  }
};
