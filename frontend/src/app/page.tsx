"use client";

import { ArrowBigRightDash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {

  return (
    <Link href='/info'>
      <Button size={'icon'} className='absolute bottom-10 right-10 p-6 rounded-full shadow-md group overflow-hidden'>
        <ArrowBigRightDash style={{ width: '22px', height: '22px' }} className='w-full h-full relative group-hover:ml-[4.7rem] transition-all duration-300' />
        <ArrowBigRightDash style={{ width: '22px', height: '22px' }} className='w-full h-full relative mr-[2.3rem]' />
      </Button>
    </Link>
  );
}
