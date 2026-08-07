class NodeExtension {
    constructor(debug) {
        this.debug = debug;
    }
    run(func, param) {
        let data = { function: func, parameter: param };
        if (this.debug) console.log("OUT: ", JSON.stringify(data));
        
        // ¡Aquí estaba el error! Ahora apunta a 'extNode'
        window.Neutralino.extensions.dispatch('extNode', 'runNode', data);
    }
    stop() {
        window.Neutralino.extensions.dispatch('extNode', 'stopNode');
    }
}
window.NodeExtension = NodeExtension;