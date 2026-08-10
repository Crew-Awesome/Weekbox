import { Grid2X2, Search } from "lucide-react";

export default function Searchbar(){
    return (
        <div className="flex items-start w-auto h-25 rounded-md bg-[#b5b5b5] ml-6 mr-6">
            <div className="bg-black rounded-2xl h-14 ml-10 mt-5 w-[30%] flex items-center">
                <Search className="w-10 h-10"></Search>
                <input type="text" className="ml-3 w-full bg-transparent" />
            </div>
            <button className="ml-auto h-14 w-14 bg-[#151515] rounded-md flex items-center justify-center">
                <Grid2X2 className="w-8 h-8 "></Grid2X2>
            </button>

        </div>

    )
}