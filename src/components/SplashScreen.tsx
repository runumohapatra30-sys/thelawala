import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Keeps the splash screen visible for 3.5 seconds
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onFinish, 400); // Smooth exit transition
    }, 3500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#FF6600] select-none"
        >
          {/* Brand splash image from public/splash.jpg */}
          <motion.img
            src="/splash.jpg"
            alt="ThelaWala"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="h-full w-full object-cover sm:object-contain"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
