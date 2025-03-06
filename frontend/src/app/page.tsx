"use client";

// import { useState, useEffect, useRef } from 'react';
import { ArrowBigRightDash } from 'lucide-react';
import Diary3D from './diary/page';
import { Button } from '@/components/ui/button';
// import gsap from 'gsap';

export default function Home() {
  // const [_isMouseMoving, setIsMouseMoving] = useState(false);
  // const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  // const buttonRef = useRef<HTMLButtonElement>(null);
  // const buttonTween = useRef<gsap.core.Tween | null>(null);

  // useEffect(() => {
  //   const handleMouseMove = (e: MouseEvent) => {
  //     setIsMouseMoving(true);

  //     // Animate position with GSAP
  //     if (buttonRef.current) {
  //       buttonTween.current = gsap.to(buttonRef.current, {
  //         x: e.clientX - 40,
  //         y: e.clientY - 20,
  //         duration: 0.8,
  //         ease: 'power2.out'
  //       });
  //     }

  //     // Animate opacity with GSAP for better synchronization
  //     gsap.to(buttonRef.current, {
  //       opacity: 1,
  //       duration: 0.5,
  //       ease: 'power2.out'
  //     });

  //     if (timeoutRef.current) {
  //       clearTimeout(timeoutRef.current);
  //     }
  //     timeoutRef.current = setTimeout(() => {
  //       gsap.to(buttonRef.current, {
  //         opacity: 0,
  //         duration: 0.8,
  //         ease: 'power2.out'
  //       });
  //     }, 2000);
  //   };

  //   window.addEventListener('mousemove', handleMouseMove);
  //   return () => {
  //     window.removeEventListener('mousemove', handleMouseMove);
  //     buttonTween.current?.kill();
  //     if (timeoutRef.current) {
  //       clearTimeout(timeoutRef.current);
  //     }
  //   };
  // }, []);

  return (
    <div className="w-full h-screen absolute -z-10 overflow-hidden">
      <Diary3D />
      <Button size={'icon'} className='absolute bottom-10 right-10 p-6 rounded-full shadow-md group overflow-hidden'>
        <ArrowBigRightDash style={{ width: '22px', height: '22px' }} className='w-full h-full relative group-hover:ml-[4.7rem] transition-all duration-300' />
        <ArrowBigRightDash style={{ width: '22px', height: '22px' }} className='w-full h-full relative mr-[2.3rem]' />
      </Button>

      {/* <Button
        ref={buttonRef}
        variant={'secondary'}
        className="text-base capitalize rounded absolute mix-blend-darken z-40 shadow-md shadow-gray-500/30"
        style={{
          pointerEvents: 'none',
          left: 0,
          top: 0,
          opacity: 0,
          filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1)) drop-shadow(0 4px 4px rgba(0, 0, 0, 0.06))'
        }}
      >
        start writing
      </Button> */}
    </div>
  );
}