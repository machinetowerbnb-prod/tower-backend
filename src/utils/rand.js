export function randomPassword(len = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: len }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join('');
}