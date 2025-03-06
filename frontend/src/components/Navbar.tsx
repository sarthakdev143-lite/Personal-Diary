"use client";

import { Menu, X, RotateCcw } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { useDiary } from "@/context/DiaryContext";

const Switch = ({ checked, onCheckedChange }: { checked: boolean, onCheckedChange: () => void }) => {
    return (
        <button
            role="switch"
            aria-checked={checked}
            onClick={onCheckedChange}
            className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer 
                    rounded-full border-[3px] border-transparent 
                transition-colors duration-200 ease-in-out
                ${checked ? 'bg-white' : 'bg-zinc-700'}
            `}
        >
            <span
                className={`
                    pointer-events-none inline-block h-4 w-4 rounded-full 
                    bg-zinc-900 shadow transform transition duration-200 ease-in-out
                    ${checked ? 'translate-x-5' : 'translate-x-0'}
                `}
            />
        </button>
    );
};

const Navbar = () => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { isRotating, setIsRotating, resetDiaryPosition } = useDiary();

    const handleToggle = (type: string) => {
        switch (type) {
            case 'rotation':
                setIsRotating(!isRotating);
                break;
            case 'reset':
                resetDiaryPosition();
                break;
            default:
                break;
        };
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <header className="absolute z-30 w-full mt-8">
            <nav className="flex justify-end mx-auto w-11/12 relative" ref={dropdownRef}>
                {/* Dropdown Trigger */}
                <Button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    variant="ghost"
                    className="transition-colors duration-500 ease-in-out hover:text-white bg-zinc-900 hover:bg-zinc-800"
                >
                    {isDropdownOpen ? <X /> : <Menu />}
                </Button>

                {/* Dropdown Content */}
                {isDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-zinc-900 rounded-md shadow-lg">
                        <div className="px-4 py-2 font-semibold text-base text-white border-b border-gray-700">
                            Settings
                        </div>

                        <div className="px-4 py-3 flex items-center justify-between">
                            <span className="text-sm text-white">Rotation</span>
                            <Switch
                                checked={isRotating}
                                onCheckedChange={() => handleToggle('rotation')}
                            />
                        </div>

                        <div className="px-4 py-3 border-t border-gray-700">
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-sm text-white hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                                onClick={() => handleToggle('reset')}
                            >
                                <RotateCcw className="w-4 h-4" />
                                Reset Position
                            </Button>
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
};

export default Navbar;