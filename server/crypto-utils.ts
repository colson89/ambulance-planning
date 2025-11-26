import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET environment variable is required and must be at least 32 characters for SMTP password encryption');
  }
  return crypto.scryptSync(secret, 'smtp-encryption-salt', 32);
}

export function encryptPassword(plainText: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return 'enc:' + iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decryptPassword(encryptedText: string): string | null {
  if (!encryptedText.startsWith('enc:')) {
    console.warn('Invalid encrypted password format - password must be re-entered');
    return null;
  }

  try {
    const key = getEncryptionKey();
    const parts = encryptedText.substring(4).split(':');
    
    if (parts.length !== 3) {
      console.warn('Invalid encrypted password structure - password must be re-entered');
      return null;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt password - password must be re-entered:', error);
    return null;
  }
}

export function isEncryptionAvailable(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}
