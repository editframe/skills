import crypto from "node:crypto";

export const generatePassword = async (password: string) => {
  const salt = crypto.randomBytes(16);
  const keylen = 64;
  return new Promise<[key: Buffer, salt: Buffer]>((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, (err, derivedKey) => {
      if (err) return reject(err);
      resolve([derivedKey, salt] as const);
    });
  });
};

export const verifyPassword = async (
  password: string,
  digest: Buffer,
  salt: Buffer,
) => {
  const keylen = 64;
  return new Promise<boolean>((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(crypto.timingSafeEqual(digest, derivedKey));
    });
  });
};

export const generateApiToken = async (token: string) => {
  const salt = crypto.randomBytes(16);
  const keylen = 64;
  return new Promise<[key: Buffer, salt: Buffer]>((resolve, reject) => {
    crypto.scrypt(token, salt, keylen, (err, derivedKey) => {
      if (err) return reject(err);
      resolve([derivedKey, salt] as const);
    });
  });
};

export const verifyApiToken = async (
  token: string,
  digest: Buffer,
  salt: Buffer,
) => {
  return new Promise<boolean>((resolve, reject) => {
    const keylen = 64;
    crypto.scrypt(token, salt, keylen, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(crypto.timingSafeEqual(digest, derivedKey));
    });
  });
};
