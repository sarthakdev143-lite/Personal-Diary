"use client";

import { useRef } from "react";
// import { useGSAP } from "@gsap/react";
// import gsap from "gsap";
import LenisProvider from "@/components/LenisProvider";
import Landing from "@/components/info/Landing";
import WhyChooseThis from "@/components/info/WhyChooseThis";

export default function Home() {
  const infoParentRef = useRef<HTMLDivElement>(null);

  // useGSAP(() => {
  //     gsap.fromTo(infoParentRef.current,
  //         { opacity: 0 }, {
  //         opacity: 1,
  //         duration: 1,
  //         ease: 'power2.out'
  //     });
  // }, []);

  return (
    <>
      <LenisProvider>
        <div id="info-parent" ref={infoParentRef} className="w-full h-auto backdrop-blur-lg flex flex-col max-xs:px-2 px-4">
          <Landing />
          <WhyChooseThis />
        </div>
        <div className="h-screen w-full pointer-events-none"></div>
      </LenisProvider>
    </>
  );
};

// "use client";

// import { ArrowBigRightDash } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import Link from 'next/link';

// export default function Home() {

//   return (
//     <Button asChild size={'icon'} className='absolute bottom-10 right-10 p-6 rounded-full shadow-md group overflow-hidden'>
//       <Link href='/info'>
//         <div className="relative flex items-center gap-2">
//           <ArrowBigRightDash style={{ width: '22px', height: '22px' }} className='w-full h-full relative group-hover:ml-[4.7rem] transition-all duration-300' />
//           <ArrowBigRightDash style={{ width: '22px', height: '22px' }} className='w-full h-full relative mr-[2.3rem]' />
//         </div>
//       </Link>
//     </Button>
//   );
// }
