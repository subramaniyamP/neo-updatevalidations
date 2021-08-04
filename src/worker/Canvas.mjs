import Neo       from '../Neo.mjs';
import Base      from './Base.mjs';
import * as core from '../core/_export.mjs';

/**
 * Experimental.
 * The Canvas worker is responsible for dynamically manipulating offscreen canvas.
 * See: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
 * @class Neo.worker.Canvas
 * @extends Neo.worker.Base
 * @singleton
 */
class Canvas extends Base {
    static getConfig() {return {
        /**
         * @member {String} className='Neo.worker.Canvas'
         * @protected
         */
        className: 'Neo.worker.Canvas',
        /**
         * @member {Boolean} singleton=true
         * @protected
         */
        singleton: true,
        /**
         * @member {String} workerId='canvas'
         * @protected
         */
        workerId: 'canvas'
    }}

    /**
     *
     */
    afterConnect() {
        let me      = this,
            channel = new MessageChannel(),
            port    = channel.port2;

        channel.port1.onmessage = me.onMessage.bind(me);

        me.sendMessage('app', {action: 'registerPort', transfer: port}, [port]);

        me.channelPorts.app = channel.port1;
    }

    /**
     *
     * @param {Object} data
     */
    onRegisterCanvas(data) {
        console.log('onRegisterCanvas', data);

        Neo.currentWorker.sendMessage(data.origin, {
            action : 'reply',
            replyId: data.id,
            success: true
        });
    }

    /**
     *
     * @param {Object} msg
     */
    onRegisterNeoConfig(msg) {
        super.onRegisterNeoConfig(msg);

        let path = Neo.config.appPath.slice(0, -8); // removing "/app.mjs"

        import(
            /* webpackInclude: /\/app.mjs$/ */
            /* webpackExclude: /\/node_modules/ */
            /* webpackMode: "lazy" */
            `../../${path}/canvas.mjs`
        ).then(module => {
            console.log(module);
        });
    }
}

Neo.applyClassConfig(Canvas);

let instance = Neo.create(Canvas);

Neo.applyToGlobalNs(instance);

export default instance;
