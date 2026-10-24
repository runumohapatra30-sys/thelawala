Import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import logo from '@/assets/thelawala-brand.jpeg.asset.json';

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // SplashScreen duration: 3.5 seconds
    const timer = setTimeout(() => {
      setVisible(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-label="Opening ThelaWala"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.45 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#FF6600] overflow-hidden select-none"
          onClick={() => setVisible(false)}
        >
          {/* Centered Brand Logo with smooth scale animation */}
          <motion.img
            src={logo.url}
            alt="ThelaWala"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-56 max-w-[65vw] object-contain drop-shadow-md"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
