import { describe, it, expect } from 'vitest';
import { dancedSecret, dancedCount } from './danceAlong';

describe('danceAlong helpers', () => {
  it('dancedSecret namespaces the durable secret id by entity', () => {
    expect(dancedSecret('deep-lurker')).toBe('danced:deep-lurker');
  });

  it('dancedCount counts only danced:* secrets among other progress', () => {
    expect(dancedCount([])).toBe(0);
    expect(dancedCount(['dice-monster', 'classified'])).toBe(0);
    expect(dancedCount(['danced:a', 'dice-monster', 'danced:b'])).toBe(2);
  });
});
