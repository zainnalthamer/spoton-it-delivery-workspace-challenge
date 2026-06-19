import { isValidTransition } from './work-item-transitions';

describe('isValidTransition', () => {
  describe('valid forward transitions (happy path)', () => {
    it('allows backlog -> planned', () => {
      expect(isValidTransition('backlog', 'planned')).toBe(true);
    });

    it('allows planned -> in_progress', () => {
      expect(isValidTransition('planned', 'in_progress')).toBe(true);
    });

    it('allows in_progress -> qa', () => {
      expect(isValidTransition('in_progress', 'qa')).toBe(true);
    });

    it('allows qa -> ready_for_release', () => {
      expect(isValidTransition('qa', 'ready_for_release')).toBe(true);
    });

    it('allows ready_for_release -> released', () => {
      expect(isValidTransition('ready_for_release', 'released')).toBe(true);
    });
  });

  describe('allowed backward transitions', () => {
    it('allows qa -> in_progress', () => {
      expect(isValidTransition('qa', 'in_progress')).toBe(true);
    });

    it('allows ready_for_release -> qa', () => {
      expect(isValidTransition('ready_for_release', 'qa')).toBe(true);
    });
  });

  describe('no-op (same status)', () => {
    it('treats same-to-same as valid (no-op, not a real transition)', () => {
      expect(isValidTransition('qa', 'qa')).toBe(true);
      expect(isValidTransition('backlog', 'backlog')).toBe(true);
    });
  });

  describe('invalid transitions (explicit spec examples)', () => {
    it('rejects backlog -> released (skipping the whole pipeline)', () => {
      expect(isValidTransition('backlog', 'released')).toBe(false);
    });

    it('rejects in_progress -> ready_for_release (skipping qa)', () => {
      expect(isValidTransition('in_progress', 'ready_for_release')).toBe(false);
    });
  });

  describe('other invalid transitions', () => {
    it('rejects backlog -> in_progress (skipping planned)', () => {
      expect(isValidTransition('backlog', 'in_progress')).toBe(false);
    });

    it('rejects planned -> qa (skipping in_progress)', () => {
      expect(isValidTransition('planned', 'qa')).toBe(false);
    });

    it('rejects released -> any other status (terminal state)', () => {
      expect(isValidTransition('released', 'backlog')).toBe(false);
      expect(isValidTransition('released', 'qa')).toBe(false);
      expect(isValidTransition('released', 'ready_for_release')).toBe(false);
    });

    it('rejects backward moves beyond the two explicitly allowed', () => {
      expect(isValidTransition('in_progress', 'planned')).toBe(false);
      expect(isValidTransition('planned', 'backlog')).toBe(false);
      expect(isValidTransition('released', 'ready_for_release')).toBe(false);
    });

    it('rejects an unknown/garbage status as the "from" state', () => {
      expect(isValidTransition('not_a_real_status', 'planned')).toBe(false);
    });
  });
});