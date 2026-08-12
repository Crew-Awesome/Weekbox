import { Grid2X2, Search } from "lucide-react";

export default function Searchbar(){
    return (
        <div className="flex items-start w-full md:w-auto h-25 rounded-t-none rounded-b-[16px] bg-[var(--wb-surface-container)] mx-0 md:mx-2 px-4 md:px-6">
            <div className="bg-black rounded-2xl h-14 mt-5 w-[40%] md:w-[30%] flex items-center">
                <Search className="w-10 h-10 ml-2 md:ml-4"></Search>
                <input type="text" className="ml-3 w-full bg-transparent outline-none" />
            </div>
            <button className="ml-auto mt-5 h-14 w-14 bg-[var(--wb-surface-container-high)] hover:bg-[var(--wb-surface-container-highest)] rounded-md flex items-center justify-center transition-colors">
                <Grid2X2 className="w-8 h-8 text-[var(--wb-icon-default)]"></Grid2X2>
            </button>
        </div>

    )
}