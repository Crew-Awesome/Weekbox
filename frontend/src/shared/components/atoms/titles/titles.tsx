
export default function Titles({ title }: { title: string }) {
    return (
        <div className="flex w-full items-stretch px-6 my-6">
            {/* Contenedor del texto con linea inferior */}
            <div className="flex flex-col justify-end border-b-[3px] border-white pr-3 shrink-0">
                <h1 className="text-white font-bold text-2xl md:text-3xl whitespace-nowrap pb-1 leading-none">
                    {title}
                </h1>
            </div>
            
            {/* El escalon diagonal */}
            <div className="w-6 shrink-0 relative overflow-visible">
                <svg 
                    className="absolute inset-0 w-full h-full overflow-visible" 
                    viewBox="0 0 100 100" 
                    preserveAspectRatio="none"
                >
                    <line 
                        x1="0" y1="100" 
                        x2="100" y2="0" 
                        stroke="white" 
                        strokeWidth="3" 
                        vectorEffect="non-scaling-stroke" 
                    />
                </svg>
            </div>

            {/* Linea superior que continua hacia la derecha */}
            <div className="flex-1 border-t-[3px] border-white min-w-[20px]"></div>
        </div>
    );
}