import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const gen = customAlphabet(alphabet, 24);

export function createToken(): string {
  return gen();
}

export function createId(): string {
  return gen();
}
