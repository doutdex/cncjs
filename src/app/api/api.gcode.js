import store from '../store';
import {
    ERR_BAD_REQUEST,
    ERR_INTERNAL_SERVER_ERROR
} from '../constants';

export const set = (req, res) => {
    const { port, name, gcode, context = {} } = req.body;

    if (!port) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'No port specified'
        });
        return;
    }
    if (!gcode) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'Empty G-code'
        });
        return;
    }

    const controller = store.get('controllers["' + port + '"]');
    if (!controller) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'Controller not found'
        });
        return;
    }

    // Load G-code
    controller.command(null, 'gcode:load', name, gcode, context, (err, state) => {
        if (err) {
            res.status(ERR_INTERNAL_SERVER_ERROR).send({
                msg: 'Failed to load G-code: ' + err
            });
            return;
        }

        res.send({ ...state });
    });
};

export const get = (req, res) => {
    const port = req.query.port;

    if (!port) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'No port specified'
        });
        return;
    }

    const controller = store.get('controllers["' + port + '"]');
    if (!controller) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'Controller not found'
        });
        return;
    }

    const { sender } = controller;

    res.send({
        ...sender.toJSON(),
        data: sender.state.gcode
    });
};

export const download = (req, res) => {
    const port = req.query.port;

    if (!port) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'No port specified'
        });
        return;
    }

    const controller = store.get('controllers["' + port + '"]');
    if (!controller) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'Controller not found'
        });
        return;
    }

    const { sender } = controller;
    const filename = (function(req) {
        const headers = req.headers || {};
        const ua = headers['user-agent'] || '';
        const isIE = (function(ua) {
            return (/MSIE \d/).test(ua);
        }(ua));
        const isEdge = (function(ua) {
            return (/Trident\/\d/).test(ua) && (!(/MSIE \d/).test(ua));
        }(ua));

        const name = sender.state.name || 'noname.txt';
        return (isIE || isEdge) ? encodeURIComponent(name) : name;
    }(req));
    const content = sender.state.gcode || '';

    res.setHeader('Content-Disposition', 'attachment; filename=' + JSON.stringify(filename));
    res.setHeader('Connection', 'close');

    res.write(content);
    res.end();
};
