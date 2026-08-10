


export default function Card(){
const modstest = [
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },
    { name: "Friday Night Funkin': Mario's Madness", description: "A Mod for Friday Night Funkin'.",img:"/assets/images/placeholder-mini.jpg",icon:"/assets/icons/categories/vslice.png" },

]   

return(
    <div className="grid grid-cols-4 grid-rows-4 gap-12 ml-6 mr-6 h-auto w-auto"> 
        {modstest.map((item,index) => (
            <div key={index}  className=" relative shadow-2xs overflow-hidden bg-[#282828] rounded-md " style={{ fontFamily: "Manrope, sans-serif", fontWeight: 500 }}>
            
                <div className="relative">     
                    <div className="absolute left-0 rounded-bl-lg rounded-br-lg bg-[#282828]">
                        <div className="w-18 h-18  flex items-center justify-center overflow-hidden"> 
                            <img className=" object-contain w-12 h-12 block"src={item.icon}></img> 
                        </div>
                    <div
                        className="absolute w-4 h-4 left-0 rotate-90 right-0 bottom-0"
                        style={{background: "radial-gradient(circle at top left, transparent 16px, #282828 16.5px)"}}/>
                        <div
                        className="absolute w-6 h-6 left-0 rotate-180 right-0 top-0"
                        style={{background: "radial-gradient(circle at top left, transparent 16px, #282828 16.5px)"}}/>
                    
                    </div>

                    <img className="w-full block"src={item.img}></img>
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t  from-black to-transparent" />
                </div>
                
                <strong className="text-[25px]">{item.name.length > 35 ? item.name.slice(0,35) + "..." : item.name}</strong> 
                <h5 className="text-gray-400 text-sm">{item.description}</h5>
            </div>
        ))}

        
        
    </div>
)

}