const AVATAR_PALETTE_SIZE = 8;

export const getAvatarIndex = (seed: string): number => {
  if (seed.length === 0) return 1;

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }

  return (Math.abs(hash) % AVATAR_PALETTE_SIZE) + 1;
};
