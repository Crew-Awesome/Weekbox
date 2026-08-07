import { useEffect } from 'react';



export default function Test() {
    useEffect(() => {
        window.NODE?.run("setActivity", { details: "OTRA PAGINA", state:"probando we" });
    },[])
    return (
        <div>
            <h1>Test Page</h1>
        </div>

    )
}