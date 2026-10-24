import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import logo from '@/assets/thelawala-brand.jpeg.asset.json';
import video from '@/assets/thelawala-opening.mp4.asset.json';

const IMAGES = [
  logo.url,
  '/food/food-biryani.jpg',
  '/food/food-chaat.jpg',
  '/food/food-dahibara.jpg',
  '/food/food-roll.jpg',
  '/food/food-tiffin.jpg',
  '/food/food-momo.jpg',
  '/food/food-thali.jpg',
];

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Preload critical food images during video playback
    for (const src of IMAGES) {
      const image = new Image();
      image.src = src;
      void image.decode().catch(() => {});
    }

    // Full 6.8 seconds timer (matches full video length)
    const timer = setTimeout(() => {
      setVisible(false);
    }, 6800);

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
          transition={{ duration: reducedMotion ? 0 : 0.55 }}
          className="fixed inset-0 z-[1000] grid place-items-center overflow-hidden bg-launch"
          onClick={() => setVisible(false)}
        >
          {!reducedMotion && (
            <video
              src={video.url}
              autoPlay
              muted
              playsInline
              preload="auto"
              onEnded={() => setVisible(false)}
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}

          <motion.img
            src={logo.url}
            alt="ThelaWala"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.6 }}
            className="relative w-64 max-w-[70vw] object-contain"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
