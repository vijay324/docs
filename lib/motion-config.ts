/**
 * Framer Motion Configuration for flotick
 * Provides consistent animation presets and motion utilities
 */

import { Variants, Transition } from 'framer-motion';

// Check for reduced motion preference
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Base transition configurations
export const transitions = {
  // Smooth and natural feeling
  smooth: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  } as Transition,

  // Slower smooth transition for page changes (approx 0.5-0.6s)
  slow: {
    type: 'spring',
    stiffness: 100,
    damping: 20,
    mass: 1.2,
  } as Transition,
  
  // Cinematic smooth fade (300-500ms ease-in-out)
  cinematic: {
    duration: 0.4,
    ease: 'easeInOut',
  } as Transition,
  
  // Quick and snappy
  snappy: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
  } as Transition,
  
  // Gentle and slow
  gentle: {
    type: 'spring',
    stiffness: 200,
    damping: 35,
  } as Transition,
  
  // Linear for simple movements
  linear: {
    duration: 0.3,
    ease: 'easeInOut',
  } as Transition,
  
  // Fast linear for micro-interactions
  fast: {
    duration: 0.15,
    ease: 'easeOut',
  } as Transition,
};

// Page transition variants - Fade out then Fade in with subtle slide
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10, // Start slightly below
    scale: 0.98, // Subtle scale for depth
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: prefersReducedMotion() ? { duration: 0 } : {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1.0], // Cubic bezier for "premium" feel
      staggerChildren: 0.1
    },
  },
  exit: {
    opacity: 0,
    y: -10, // Slide slightly up
    scale: 0.98,
    transition: prefersReducedMotion() ? { duration: 0 } : {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1.0]
    },
  },
};

// Fade in variants
export const fadeInVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: prefersReducedMotion() ? { duration: 0 } : transitions.linear,
  },
};

// Slide up variants (for reveal on scroll)
export const slideUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: prefersReducedMotion() ? { duration: 0 } : transitions.smooth,
  },
};

// Slide in from left variants
export const slideInLeftVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -30,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: prefersReducedMotion() ? { duration: 0 } : transitions.smooth,
  },
};

// Slide in from right variants
export const slideInRightVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 30,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: prefersReducedMotion() ? { duration: 0 } : transitions.smooth,
  },
};

// Scale variants for buttons and cards
export const scaleVariants: Variants = {
  initial: {
    scale: 1,
  },
  hover: {
    scale: prefersReducedMotion() ? 1 : 1.02,
    transition: transitions.fast,
  },
  tap: {
    scale: prefersReducedMotion() ? 1 : 0.98,
    transition: transitions.fast,
  },
};

// Stagger children animation
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: prefersReducedMotion() ? 0 : 0.1,
      delayChildren: prefersReducedMotion() ? 0 : 0.1,
    },
  },
};

// List item variants for staggered animations
export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: prefersReducedMotion() ? { duration: 0 } : transitions.smooth,
  },
};

// Modal/Dialog variants
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: prefersReducedMotion() ? { duration: 0 } : transitions.smooth,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: prefersReducedMotion() ? { duration: 0 } : transitions.fast,
  },
};

// Sidebar variants
export const sidebarVariants: Variants = {
  open: {
    x: 0,
    transition: prefersReducedMotion() ? { duration: 0 } : transitions.smooth,
  },
  closed: {
    x: '-100%',
    transition: prefersReducedMotion() ? { duration: 0 } : transitions.smooth,
  },
};

// Notification/Toast variants
export const toastVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -50,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: prefersReducedMotion() ? { duration: 0 } : transitions.snappy,
  },
  exit: {
    opacity: 0,
    y: -50,
    scale: 0.95,
    transition: prefersReducedMotion() ? { duration: 0 } : transitions.fast,
  },
};

// Loading spinner variants
export const spinnerVariants: Variants = {
  animate: {
    rotate: prefersReducedMotion() ? 0 : 360,
    transition: {
      duration: prefersReducedMotion() ? 0 : 1,
      repeat: prefersReducedMotion() ? 0 : Infinity,
      ease: 'linear',
    },
  },
};

// Pulse variants for loading states
export const pulseVariants: Variants = {
  animate: {
    opacity: prefersReducedMotion() ? 1 : [1, 0.5, 1],
    transition: {
      duration: prefersReducedMotion() ? 0 : 1.5,
      repeat: prefersReducedMotion() ? 0 : Infinity,
      ease: 'easeInOut',
    },
  },
};

// Viewport options for scroll-triggered animations
export const viewportOptions = {
  once: true,
  margin: '-50px',
  amount: 0.3,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Premium Micro-Interaction Variants
// ═══════════════════════════════════════════════════════════════════════════

// Subtle hover lift for interactive elements
export const hoverLiftVariants: Variants = {
  initial: {
    y: 0,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  hover: {
    y: prefersReducedMotion() ? 0 : -2,
    boxShadow: prefersReducedMotion() 
      ? '0 1px 3px rgba(0,0,0,0.1)' 
      : '0 8px 25px rgba(0,0,0,0.12)',
    transition: transitions.fast,
  },
};

// Button press animation
export const buttonPressVariants: Variants = {
  initial: {
    scale: 1,
  },
  hover: {
    scale: prefersReducedMotion() ? 1 : 1.02,
    transition: transitions.fast,
  },
  tap: {
    scale: prefersReducedMotion() ? 1 : 0.97,
    transition: { duration: 0.1 },
  },
};

// Dropdown menu variants
export const dropdownVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: prefersReducedMotion() 
      ? { duration: 0 } 
      : { type: 'spring', stiffness: 500, damping: 30, duration: 0.2 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -8,
    transition: prefersReducedMotion() ? { duration: 0 } : { duration: 0.15 },
  },
};

// Dropdown item stagger
export const dropdownItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -8,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: prefersReducedMotion() ? { duration: 0 } : transitions.fast,
  },
};

// Sheet slide variants
export const sheetVariants = {
  right: {
    hidden: { x: '100%' },
    visible: { 
      x: 0, 
      transition: prefersReducedMotion() 
        ? { duration: 0 } 
        : { type: 'spring', stiffness: 400, damping: 40 } 
    },
    exit: { 
      x: '100%', 
      transition: prefersReducedMotion() ? { duration: 0 } : { duration: 0.3 } 
    },
  },
  left: {
    hidden: { x: '-100%' },
    visible: { 
      x: 0, 
      transition: prefersReducedMotion() 
        ? { duration: 0 } 
        : { type: 'spring', stiffness: 400, damping: 40 } 
    },
    exit: { 
      x: '-100%', 
      transition: prefersReducedMotion() ? { duration: 0 } : { duration: 0.3 } 
    },
  },
  top: {
    hidden: { y: '-100%' },
    visible: { 
      y: 0, 
      transition: prefersReducedMotion() 
        ? { duration: 0 } 
        : { type: 'spring', stiffness: 400, damping: 40 } 
    },
    exit: { 
      y: '-100%', 
      transition: prefersReducedMotion() ? { duration: 0 } : { duration: 0.3 } 
    },
  },
  bottom: {
    hidden: { y: '100%' },
    visible: { 
      y: 0, 
      transition: prefersReducedMotion() 
        ? { duration: 0 } 
        : { type: 'spring', stiffness: 400, damping: 40 } 
    },
    exit: { 
      y: '100%', 
      transition: prefersReducedMotion() ? { duration: 0 } : { duration: 0.3 } 
    },
  },
} as const;

// Accordion expand/collapse
export const accordionContentVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: prefersReducedMotion() 
      ? { duration: 0 } 
      : { height: { duration: 0.25 }, opacity: { duration: 0.15 } },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: prefersReducedMotion() 
      ? { duration: 0 } 
      : { height: { duration: 0.3 }, opacity: { duration: 0.25, delay: 0.05 } },
  },
};

// Table row hover
export const tableRowVariants: Variants = {
  initial: {
    backgroundColor: 'transparent',
  },
  hover: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    transition: transitions.fast,
  },
};

// Table row stagger for initial load
export const tableRowStaggerVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: prefersReducedMotion() ? { duration: 0 } : transitions.smooth,
  },
};

// Card hover with shadow
export const cardHoverVariants: Variants = {
  initial: {
    y: 0,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  hover: {
    y: prefersReducedMotion() ? 0 : -3,
    boxShadow: prefersReducedMotion() 
      ? '0 1px 3px rgba(0,0,0,0.08)' 
      : '0 12px 30px rgba(0,0,0,0.1)',
    transition: transitions.smooth,
  },
};

// Checkbox check animation
export const checkVariants: Variants = {
  unchecked: {
    scale: 0,
    opacity: 0,
  },
  checked: {
    scale: 1,
    opacity: 1,
    transition: prefersReducedMotion() 
      ? { duration: 0 } 
      : { type: 'spring', stiffness: 500, damping: 25 },
  },
};

// Switch thumb animation
export const switchThumbVariants: Variants = {
  unchecked: {
    x: 0,
  },
  checked: {
    x: 20,
    transition: prefersReducedMotion() 
      ? { duration: 0 } 
      : { type: 'spring', stiffness: 500, damping: 30 },
  },
};

// Progress bar fill
export const progressFillVariants: Variants = {
  initial: {
    scaleX: 0,
    originX: 0,
  },
  animate: (value: number) => ({
    scaleX: value / 100,
    transition: prefersReducedMotion() 
      ? { duration: 0 } 
      : { type: 'spring', stiffness: 100, damping: 20 },
  }),
};

// Stagger container with custom delay
export const staggerContainerCustom = (staggerDelay: number = 0.05): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: prefersReducedMotion() ? 0 : staggerDelay,
      delayChildren: prefersReducedMotion() ? 0 : 0.05,
    },
  },
});

// Tooltip variants
export const tooltipVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: -4,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: prefersReducedMotion() 
      ? { duration: 0 } 
      : { type: 'spring', stiffness: 500, damping: 30, duration: 0.15 },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: prefersReducedMotion() ? { duration: 0 } : { duration: 0.1 },
  },
};

// Popover variants
export const popoverVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: prefersReducedMotion() 
      ? { duration: 0 } 
      : { type: 'spring', stiffness: 400, damping: 25 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: prefersReducedMotion() ? { duration: 0 } : { duration: 0.15 },
  },
};

// Overlay backdrop
export const overlayVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: prefersReducedMotion() ? { duration: 0 } : { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: prefersReducedMotion() ? { duration: 0 } : { duration: 0.15 },
  },
};
