export interface MathChallenge {
  left: number;
  right: number;
}

export function createMathChallenge(
  random: () => number = Math.random,
): MathChallenge {
  return {
    left: 2 + Math.floor(random() * 8),
    right: 2 + Math.floor(random() * 8),
  };
}

export function mathChallengeAnswer(challenge: MathChallenge): number {
  return challenge.left + challenge.right;
}
