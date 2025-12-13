import { describe, expect, it } from 'vitest';

import {
  EASE_OUT_EXPO,
  buttonTapAnimation,
  cardHoverAnimation,
  defaultTransition,
  fadeVariants,
  listItemVariants,
  popVariants,
  scaleVariants,
  slideDownVariants,
  slideLeftVariants,
  slideRightVariants,
  slideUpVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from '../motion';

describe('Motion utilities', () => {
  describe('easing and transitions', () => {
    it('exports EASE_OUT_EXPO curve', () => {
      expect(EASE_OUT_EXPO).toEqual([0.16, 1, 0.3, 1]);
    });

    it('exports defaultTransition with correct values', () => {
      expect(defaultTransition).toEqual({
        duration: 0.25,
        ease: EASE_OUT_EXPO,
      });
    });
  });

  describe('fade variants', () => {
    it('has correct hidden state', () => {
      expect(fadeVariants.hidden).toEqual({ opacity: 0 });
    });

    it('has correct visible state', () => {
      expect(fadeVariants.visible).toEqual({ opacity: 1 });
    });

    it('has correct exit state', () => {
      expect(fadeVariants.exit).toEqual({ opacity: 0 });
    });
  });

  describe('slide variants', () => {
    it('slideUpVariants has correct states', () => {
      expect(slideUpVariants.hidden).toEqual({ opacity: 0, y: 20 });
      expect(slideUpVariants.visible).toEqual({ opacity: 1, y: 0 });
      expect(slideUpVariants.exit).toEqual({ opacity: 0, y: -20 });
    });

    it('slideDownVariants has correct states', () => {
      expect(slideDownVariants.hidden).toEqual({ opacity: 0, y: -20 });
      expect(slideDownVariants.visible).toEqual({ opacity: 1, y: 0 });
      expect(slideDownVariants.exit).toEqual({ opacity: 0, y: 20 });
    });

    it('slideLeftVariants has correct states', () => {
      expect(slideLeftVariants.hidden).toEqual({ opacity: 0, x: 20 });
      expect(slideLeftVariants.visible).toEqual({ opacity: 1, x: 0 });
      expect(slideLeftVariants.exit).toEqual({ opacity: 0, x: -20 });
    });

    it('slideRightVariants has correct states', () => {
      expect(slideRightVariants.hidden).toEqual({ opacity: 0, x: -20 });
      expect(slideRightVariants.visible).toEqual({ opacity: 1, x: 0 });
      expect(slideRightVariants.exit).toEqual({ opacity: 0, x: 20 });
    });
  });

  describe('scale variants', () => {
    it('has correct states', () => {
      expect(scaleVariants.hidden).toEqual({ opacity: 0, scale: 0.95 });
      expect(scaleVariants.visible).toEqual({ opacity: 1, scale: 1 });
      expect(scaleVariants.exit).toEqual({ opacity: 0, scale: 0.95 });
    });
  });

  describe('stagger variants', () => {
    it('staggerContainerVariants returns correct structure', () => {
      const variants = staggerContainerVariants(0.1);

      expect(variants.hidden).toEqual({ opacity: 0 });
      expect(variants.visible).toEqual({
        opacity: 1,
        transition: {
          staggerChildren: 0.1,
        },
      });
      expect(variants.exit).toEqual({ opacity: 0 });
    });

    it('staggerContainerVariants uses default delay', () => {
      const variants = staggerContainerVariants();
      const visible = variants.visible as { transition: { staggerChildren: number } };

      expect(visible.transition.staggerChildren).toBe(0.05);
    });

    it('staggerItemVariants has correct states', () => {
      expect(staggerItemVariants.hidden).toEqual({ opacity: 0, y: 10 });
      expect(staggerItemVariants.visible).toEqual({ opacity: 1, y: 0 });
      expect(staggerItemVariants.exit).toEqual({ opacity: 0, y: -10 });
    });
  });

  describe('pop variants', () => {
    it('has correct hidden and exit states', () => {
      expect(popVariants.hidden).toEqual({ opacity: 0, scale: 0.8 });
      expect(popVariants.exit).toEqual({ opacity: 0, scale: 0.8 });
    });

    it('has spring transition in visible state', () => {
      const visible = popVariants.visible as {
        opacity: number;
        scale: number;
        transition: { type: string; damping: number; stiffness: number };
      };

      expect(visible.opacity).toBe(1);
      expect(visible.scale).toBe(1);
      expect(visible.transition.type).toBe('spring');
      expect(visible.transition.damping).toBe(15);
      expect(visible.transition.stiffness).toBe(300);
    });
  });

  describe('list item variants', () => {
    it('has correct states', () => {
      expect(listItemVariants.hidden).toEqual({ opacity: 0, x: -10 });
      expect(listItemVariants.visible).toEqual({ opacity: 1, x: 0 });
      expect(listItemVariants.exit).toEqual({ opacity: 0, x: 10 });
    });
  });

  describe('hover and tap animations', () => {
    it('cardHoverAnimation has correct props', () => {
      expect(cardHoverAnimation.whileHover).toEqual({ y: -4, transition: { duration: 0.2 } });
      expect(cardHoverAnimation.whileTap).toEqual({ scale: 0.98 });
    });

    it('buttonTapAnimation has correct props', () => {
      expect(buttonTapAnimation.whileTap).toEqual({ scale: 0.97 });
    });
  });
});
