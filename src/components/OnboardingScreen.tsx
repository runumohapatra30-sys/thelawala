import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import brandPhoto from '@/assets/thelawala-launch-photo.png.asset.json';

const IMAGES = [
  brandPhoto.url,
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

  useEffect(() => {
    // Background ରେ food photos preload କରିବା
    for (const src of IMAGES) {
      const img = new Image();
      img.src = src;
      void img.decode().catch(() => {});
    }

    // ୨.୮ ସେକେଣ୍ଡ ପରେ ସ୍ମୁଥ୍‌ଲି ବନ୍ଦ ହେବ
    const timer = setTimeout(() => {
      setVisible(false);
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-label="Welcome to ThelaWala"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden bg-[#ff6600] cursor-pointer"
          onClick={() => setVisible(false)}
        >
          <motion.img
            src={brandPhoto.url}
            alt="ThelaWala"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full w-full object-cover sm:object-contain"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
