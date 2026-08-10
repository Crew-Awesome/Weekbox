import {useEffect} from 'react';

export default function DiscordRpc(details: string, state: string) {
    useEffect(() => {
        window.NODE?.run("setActivity", { details, state });
    }, [details, state]);
}