class NodeExtension {
    constructor(debug) {
        this.debug = debug;
    }
    run(func, param) {
        let data = { function: func, parameter: param };
        if (this.debug) console.log("OUT: ", JSON.stringify(data));
        
        /*
            sta mierda tiene quue apuntar a extNode para que se conecte y 
            se dispece a la extensiob del backend de node de neu 
        */
        window.Neutralino.extensions.dispatch('extNode', 'runNode', data);
    }
    stop() {
        window.Neutralino.extensions.dispatch('extNode', 'stopNode');
    }
}
window.NodeExtension = NodeExtension;