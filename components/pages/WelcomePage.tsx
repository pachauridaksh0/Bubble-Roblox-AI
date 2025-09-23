import React, { useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { CodeBracketSquareIcon, ChatBubbleLeftRightIcon, BoltIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { AuthPage } from '../auth/AuthPage';

const testimonials = [
  { name: 'Koslox', text: "It's simple interface yet powerful capabilities are actually insane. Lemonade helped me troubleshoot and bug-hunt a lot faster." },
  { name: 'DeforsonDevYT', text: "A very efficient tool to speed up programming. While helping in areas where you get stuck, it overall helps the dev experience a lot." },
  { name: 'smellybumb5', text: "Allowed me to code scripts I couldnt do before and learn off them. It's hassle free unlike other AI tools." },
  { name: 'xanderll_2009', text: "It significantly cut the time it took to code my game. Great for quickly prototyping small features." },
  { name: 'Creator_01', text: "Bubble is a game-changer for solo developers. The conversational AI helps me brainstorm when I'm stuck." },
  { name: 'RobloxScripterX', text: "The code generation is top-notch and almost always works out of the box. Highly recommended!" },
];

export const WelcomePage: React.FC = () => {
  const [isAuthVisible, setAuthVisible] = useState(false);
  
  const { scrollY } = useScroll();
  const titleY = useTransform(scrollY, [0, 400], [0, 150]);
  const subtitleY = useTransform(scrollY, [0, 400], [0, 100]);
  const buttonY = useTransform(scrollY, [0, 400], [0, 80]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };
  
  const duplicatedTestimonials = [...testimonials, ...testimonials];

  return (
    <div className="relative min-h-screen w-full text-white flex flex-col items-center justify-start p-4 overflow-x-hidden gradient-bg animate-gradient">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 p-4 z-20">
             <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center space-x-2.5">
                    <span className="text-2xl">🫧</span>
                    <span className="text-xl font-bold tracking-wider text-white">Bubble</span>
                </div>
                <button
                    onClick={() => setAuthVisible(true)}
                    className="px-4 py-2 text-sm font-semibold text-white bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                    Sign In
                </button>
             </div>
        </header>

        <main className="relative z-10 w-full">
            {/* Hero Section */}
            <motion.section 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="text-center max-w-4xl mx-auto pt-40 pb-20"
            >
                <motion.div 
                    variants={itemVariants} 
                    className="flex justify-center items-center space-x-3 mb-4"
                    style={{ y: titleY }}
                >
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
                        Build Roblox Games Faster
                    </h1>
                </motion.div>
                <motion.p 
                    variants={itemVariants} 
                    className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mt-6 mb-10"
                    style={{ y: subtitleY }}
                >
                    Your AI-powered assistant for Roblox development. Go from idea to prototype in minutes, not hours, with intelligent code generation and a seamless workflow.
                </motion.p>
                <motion.div 
                    variants={itemVariants}
                    style={{ y: buttonY }}
                >
                    <button
                        onClick={() => setAuthVisible(true)}
                        className="px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-primary-start to-primary-end rounded-lg shadow-lg hover:scale-105 transition-transform duration-200 flex items-center gap-2 mx-auto"
                    >
                        <span>Start Creating for Free</span>
                        <ArrowRightIcon className="w-5 h-5"/>
                    </button>
                </motion.div>
            </motion.section>

            {/* Features Section */}
            <section className="py-20">
                <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
                    <div className="bg-bg-secondary/30 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary-start/20 mb-4">
                            <CodeBracketSquareIcon className="w-6 h-6 text-primary-start" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Intelligent Code Generation</h3>
                        <p className="text-gray-400">Generate high-quality, context-aware Lua scripts for any mechanic you can imagine. From simple parts to complex game systems.</p>
                    </div>
                     <div className="bg-bg-secondary/30 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary-start/20 mb-4">
                            <BoltIcon className="w-6 h-6 text-primary-start" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Seamless Workflow</h3>
                        <p className="text-gray-400">Preview generated code instantly and use the 'Run in Studio' button to streamline testing and iteration, keeping you in the flow.</p>
                    </div>
                     <div className="bg-bg-secondary/30 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary-start/20 mb-4">
                           <ChatBubbleLeftRightIcon className="w-6 h-6 text-primary-start" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Conversational AI</h3>
                        <p className="text-gray-400">Go beyond code generation. Ask questions, get explanations, debug existing code, and brainstorm ideas with your AI partner.</p>
                    </div>
                </div>
            </section>
            
            {/* Wall of Love Section */}
            <section className="py-20 text-center">
                 <h2 className="text-4xl font-bold mb-4">Loved by Developers</h2>
                 <p className="text-gray-400 mb-12">Don't just take our word for it. Here's what creators are saying.</p>
                 <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]">
                    <div className="flex animate-marquee">
                        {duplicatedTestimonials.map((testimonial, index) => (
                            <div key={index} className="flex-shrink-0 w-80 bg-bg-secondary/50 border border-white/10 rounded-xl p-6 mx-4">
                                <p className="text-gray-300 mb-4">"{testimonial.text}"</p>
                                <p className="font-semibold text-white">- {testimonial.name}</p>
                            </div>
                        ))}
                    </div>
                 </div>
            </section>

        </main>
        
        {/* Footer */}
        <footer className="w-full text-center p-8 border-t border-white/10 mt-20 z-10">
            <p className="text-gray-500">&copy; 2024 Bubble Inc. All rights reserved.</p>
        </footer>

        {/* Auth Modal Overlay */}
        <AnimatePresence>
            {isAuthVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setAuthVisible(false)}
                >
                    <div onClick={(e) => e.stopPropagation()}>
                        <AuthPage />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};