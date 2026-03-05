import { motion } from 'framer-motion';

export default function EmojiLoader() {
    return (
        <div className="flex flex-col items-center justify-center py-10">
            <div className="relative">
                {/* Bouncing Emoji */}
                <motion.div
                    animate={{
                        y: [0, -15, 0],
                        rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="text-5xl filter drop-shadow-2xl"
                >
                    📓
                </motion.div>

                {/* Animated Pencil */}
                <motion.div
                    className="absolute -right-4 -top-2 text-3xl"
                    animate={{
                        x: [0, 5, 0],
                        y: [0, 5, 0],
                        rotate: [0, 15, 0],
                    }}
                    transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                >
                    📝
                </motion.div>

                {/* Shadow */}
                <motion.div
                    className="w-10 h-1 bg-black/10 dark:bg-white/10 rounded-full blur-md mx-auto mt-4"
                    animate={{
                        scaleX: [1, 0.6, 1],
                        opacity: [0.3, 0.1, 0.3],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </div>

            <motion.p
                className="mt-6 text-[9px] font-black uppercase tracking-[0.3em] metallic-text opacity-50"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                готовим расписание...
            </motion.p>
        </div>
    );
}
