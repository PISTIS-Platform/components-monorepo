import { digits, lower, randomPassword, upper } from 'secure-random-password';

export const generatePassword = (length: number) => randomPassword({ length, characters: [lower, upper, digits] });
