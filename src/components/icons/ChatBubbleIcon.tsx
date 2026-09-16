"use client";

interface ChatBubbleIconProps {
    className?: string;
    strokeWidth?: number;
}

export function ChatBubbleIcon({ className, strokeWidth = 2 }: ChatBubbleIconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
        >
            <path
                d="M12 3C7.02944 3 3 6.58172 3 11C3 13.206 3.94784 15.2036 5.45984 16.6714C5.29296 17.7235 4.82389 18.8025 4.29289 19.7071C4.19829 19.8714 4.18666 20.0706 4.26208 20.2446C4.3375 20.4186 4.48955 20.5465 4.67269 20.592C5.80932 20.8762 7.38395 20.7266 8.64866 19.8151C9.69887 20.2667 10.8272 20.5 12 20.5C16.9706 20.5 21 16.4183 21 12C21 7.58172 16.9706 3 12 3Z"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="8.5" cy="12" r="0.9" fill="currentColor" />
            <circle cx="12" cy="12" r="0.9" fill="currentColor" />
            <circle cx="15.5" cy="12" r="0.9" fill="currentColor" />
        </svg>
    );
}