import * as React from "react";

interface SVGProps {
    className?: string;
    width?: number | string;
    height?: number | string;
}

const YandexSVG = ({ className }: SVGProps) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 36 36"
            className={className}
        >
            <path fill="#fc3f1d" d="M35,18A17,17,0,1,0,18,35,17,17,0,0,0,35,18Z" />
            <path fill="#fff" d="M20.13,10.59H18.57c-2.87,0-4.38,1.45-4.38,3.59,0,2.43,1.05,3.57,3.19,5l1.77,1.19L14.06,28h-3.8l4.57-6.8c-2.63-1.89-4.1-3.72-4.1-6.8,0-3.89,2.71-6.53,7.82-6.53h5.1V28H20.12V10.59Z" />
        </svg>
    );
};

export default YandexSVG;