
export default function Titles({ title }: {title:string}){
    return (
        
            <div className="relative ml-6 mr-6 h-30  sm:ml-6 sm:mr-6 sm:h-24 md:h-30 w-auto">
            <h1 className=" absolute text-white font-bold mt-4 text-3xl sm:mt-4 sm:text-2xl md:text-3x whitespace-nowrap">
            {title}
            </h1>
            <svg className=" absolute flex h-30 w-full" preserveAspectRatio="none" viewBox="0 0 100 24"> 
                <polyline
                points="-20,12 6,12 8,4 100,4 "
                fill="none"
                stroke="rgba(255,255,255)"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
                />
            </svg>

        </div>


    )
}