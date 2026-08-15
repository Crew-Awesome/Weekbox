interface TitlesProps {
    title: string;
    align?: 'left' | 'center' | 'right';
}

export default function Titles({ title, align = 'left' }: TitlesProps) {
    const textNode = (
        <div className="flex flex-col justify-end border-b-[3px] border-white px-3 shrink-0">
            <h1 className="text-white font-bold text-2xl md:text-3xl whitespace-nowrap pb-1 leading-none">
                {title}
            </h1>
        </div>
    );

    const diagonalUp = (
        <div className="w-6 shrink-0 relative overflow-visible">
            <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="0" y1="100" x2="100" y2="0" stroke="white" strokeWidth="3" vectorEffect="non-scaling-stroke" />
            </svg>
        </div>
    );

    const diagonalDown = (
        <div className="w-6 shrink-0 relative overflow-visible">
            <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="0" y1="0" x2="100" y2="100" stroke="white" strokeWidth="3" vectorEffect="non-scaling-stroke" />
            </svg>
        </div>
    );

    const lineTop = <div className="flex-1 border-t-[3px] border-white min-w-[20px]"></div>;

    return (
        <div className="flex items-stretch -mx-8 px-0 sm:mx-0 sm:px-6 my-6">
            {align === 'left' && (
                <>
                    {textNode}
                    {diagonalUp}
                    {lineTop}
                </>
            )}

            {align === 'right' && (
                <>
                    {lineTop}
                    {diagonalDown}
                    {textNode}
                </>
            )}

            {align === 'center' && (
                <>
                    {lineTop}
                    {diagonalDown}
                    {textNode}
                    {diagonalUp}
                    {lineTop}
                </>
            )}
        </div>
    );
}