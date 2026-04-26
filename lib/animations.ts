// Animation presets — Remotion spring physics via Framer Motion
import type { Variants, Transition } from 'framer-motion';

export const springs = {
  snappy:    { type: 'spring', stiffness: 500, damping: 35 } as Transition,
  smooth:    { type: 'spring', stiffness: 300, damping: 28 } as Transition,
  bouncy:    { type: 'spring', stiffness: 400, damping: 20 } as Transition,
  cinematic: { type: 'spring', stiffness: 200, damping: 25 } as Transition,
  gentle:    { type: 'spring', stiffness: 150, damping: 22 } as Transition,
};

export const variants = {
  fadeUp: {
    hidden:  { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0  },
  } as Variants,

  fadeDown: {
    hidden:  { opacity: 0, y: -16 },
    visible: { opacity: 1, y: 0   },
  } as Variants,

  scaleIn: {
    hidden:  { opacity: 0, scale: 0.94 },
    visible: { opacity: 1, scale: 1    },
  } as Variants,

  slideRight: {
    hidden:  { opacity: 0, x: -24 },
    visible: { opacity: 1, x: 0   },
  } as Variants,

  slideLeft: {
    hidden:  { opacity: 0, x: 24 },
    visible: { opacity: 1, x: 0  },
  } as Variants,

  modalEnter: {
    hidden:  { opacity: 0, y: 20, scale: 0.96 },
    visible: { opacity: 1, y: 0,  scale: 1    },
    exit:    { opacity: 0, y: 16, scale: 0.97 },
  } as Variants,

  pageSwitch: {
    hidden:  { opacity: 0, scale: 0.96, filter: 'blur(8px)' },
    visible: { opacity: 1, scale: 1,    filter: 'blur(0px)' },
    exit:    { opacity: 0, scale: 1.02, filter: 'blur(6px)' },
  } as Variants,

  staggerContainer: {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.055, delayChildren: 0.02 } },
  } as Variants,

  staggerItem: {
    hidden:  { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0  },
  } as Variants,

  walletSlideIn: {
    hidden:  { opacity: 0, x: 40  },
    visible: { opacity: 1, x: 0   },
    exit:    { opacity: 0, x: -40 },
  } as Variants,
};

// 3D tilt calculation from mouse position
export function tilt3D(clientX: number, clientY: number, rect: DOMRect) {
  const cx = (clientX - rect.left) / rect.width - 0.5;
  const cy = (clientY - rect.top) / rect.height - 0.5;
  return { rotateX: -cy * 10, rotateY: cx * 10 };
}

// Stagger delay helper
export function staggerDelay(i: number, base = 0.04) {
  return { ...springs.smooth, delay: i * base };
}
