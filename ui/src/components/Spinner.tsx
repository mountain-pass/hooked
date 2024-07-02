
export const Spinner = ({ className = '' }: { className?: string }) => (
    <svg
        aria-hidden="true"
        className={`inline animate-spin fill-blue-500 text-gray-500 dark:text-neutral-600 ${className}`}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <mask id="circle">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <circle cx="50" cy="50" r="40" fill="black" />
        </mask>
        <mask id="arc">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <circle cx="50" cy="50" r="40" fill="black" />
            <rect x="0" y="0" width="80%" height="100%" fill="black" />
        </mask>
        <circle cx="50" cy="50" r="50" fill="currentColor" mask="url(#circle)" />
        <circle cx="50" cy="50" r="50" fill="currentFill" mask="url(#arc)" />
    </svg>
)