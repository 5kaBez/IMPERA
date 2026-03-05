import { motion } from 'framer-motion';

export default function NotebookLoader() {
    return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="relative w-48 h-64 perspective-1000">
                {/* Notebook Cover (Back) */}
                <div className="absolute inset-0 bg-zinc-900 rounded-r-lg shadow-2xl border-l-[6px] border-zinc-800" />

                {/* Pages Container */}
                <motion.div
                    className="absolute inset-y-1 right-1 left-3 bg-[#fdfaf0] rounded-r-md shadow-inner origin-left overflow-hidden"
                    initial={{ rotateY: -10 }}
                    animate={{ rotateY: -110 }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut"
                    }}
                    style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
                >
                    {/* Lined paper effect */}
                    <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: 'linear-gradient(#0010b0 1px, transparent 1px)',
                        backgroundSize: '100% 1.5rem',
                        paddingTop: '1rem'
                    }} />

                    {/* Scribble Animation */}
                    <svg className="absolute inset-0 w-full h-full p-6">
                        <motion.path
                            d="M 20 40 L 100 40 M 20 60 L 80 60 M 20 80 L 120 80 M 20 100 L 90 100"
                            fill="transparent"
                            stroke="#1c1c1e"
                            strokeWidth="2"
                            strokeLinecap="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 0.6 }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                repeatDelay: 0.5,
                                ease: "linear"
                            }}
                        />
                    </svg>
                </motion.div>

                {/* Static Page (Front/Under) */}
                <div className="absolute inset-y-1 right-1 left-3 bg-[#fdfaf0] rounded-r-md shadow-inner -z-10 overflow-hidden">
                    <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: 'linear-gradient(#0010b0 1px, transparent 1px)',
                        backgroundSize: '100% 1.5rem',
                        paddingTop: '1rem'
                    }} />
                    <svg className="absolute inset-0 w-full h-full p-6">
                        <motion.path
                            d="M 20 40 L 140 40 M 20 60 L 110 60 M 20 80 L 130 80 M 20 100 L 100 100"
                            fill="transparent"
                            stroke="#1c1c1e"
                            strokeWidth="2"
                            strokeLinecap="round"
                            initial={{ opacity: 0.3 }}
                            animate={{ opacity: 0.5 }}
                            transition={{ duration: 1, repeat: Infinity, repeatType: "mirror" }}
                        />
                    </svg>
                </div>

                {/* Spine Detail */}
                <div className="absolute top-4 bottom-4 left-0 w-[8px] bg-gradient-to-r from-zinc-800 to-zinc-900 rounded-l-md shadow-lg" />
            </div>

            <motion.p
                className="mt-12 text-[10px] font-black uppercase tracking-[0.4em] metallic-text opacity-70"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 0.7, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
            >
                Записываем расписание...
            </motion.p>
        </div>
    );
}
