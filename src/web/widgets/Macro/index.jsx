import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import api from '../../api';
import Widget from '../../components/Widget';
import confirm from '../../lib/confirm';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import log from '../../lib/log';
import WidgetConfig from '../WidgetConfig';
import Macro from './Macro';
import AddMacro from './AddMacro';
import EditMacro from './EditMacro';
import RunMacro from './RunMacro';
import {
    MODAL_NONE,
    MODAL_ADD_MACRO,
    MODAL_EDIT_MACRO,
    MODAL_RUN_MACRO
} from './constants';
import styles from './index.styl';

class MacroWidget extends PureComponent {
    static propTypes = {
        widgetId: PropTypes.string.isRequired,
        onFork: PropTypes.func.isRequired,
        onRemove: PropTypes.func.isRequired,
        sortable: PropTypes.object
    };

    // Public methods
    collapse = () => {
        this.setState({ minimized: true });
    };
    expand = () => {
        this.setState({ minimized: false });
    };

    config = new WidgetConfig(this.props.widgetId);
    state = this.getInitialState();
    actions = {
        toggleFullscreen: () => {
            const { minimized, isFullscreen } = this.state;
            this.setState({
                minimized: isFullscreen ? minimized : false,
                isFullscreen: !isFullscreen
            });
        },
        toggleMinimized: () => {
            const { minimized } = this.state;
            this.setState({ minimized: !minimized });
        },
        openModal: (name = MODAL_NONE, params = {}) => {
            this.setState({
                modal: {
                    name: name,
                    params: params
                }
            });
        },
        closeModal: () => {
            this.setState({
                modal: {
                    name: MODAL_NONE,
                    params: {}
                }
            });
        },
        updateModalParams: (params = {}) => {
            this.setState({
                modal: {
                    ...this.state.modal,
                    params: {
                        ...this.state.modal.params,
                        ...params
                    }
                }
            });
        },
        fetchMacros: async () => {
            try {
                let res;
                res = await api.macros.fetch({ paging: false });
                const { records: macros } = res.body;
                this.setState({ macros: macros });
            } catch (err) {
                // Ignore error
            }
        },
        addMacro: async ({ name, content }) => {
            try {
                let res;
                res = await api.macros.create({ name, content });
                res = await api.macros.fetch({ paging: false });
                const { records: macros } = res.body;
                this.setState({ macros: macros });
            } catch (err) {
                // Ignore error
            }
        },
        deleteMacro: async (id) => {
            try {
                let res;
                res = await api.macros.delete(id);
                res = await api.macros.fetch({ paging: false });
                const { records: macros } = res.body;
                this.setState({ macros: macros });
            } catch (err) {
                // Ignore error
            }
        },
        updateMacro: async (id, { name, content }) => {
            try {
                let res;
                res = await api.macros.update(id, { name, content });
                res = await api.macros.fetch({ paging: false });
                const { records: macros } = res.body;
                this.setState({ macros: macros });
            } catch (err) {
                // Ignore error
            }
        },
        runMacro: (id, { name }) => {
            controller.command('macro:run', id, controller.context, (err, data) => {
                if (err) {
                    log.error(`Failed to run the macro: id=${id}, name="${name}"`);
                    return;
                }
            });
        },
        confirmLoadMacro: ({ name }) => confirm({
            title: i18n._('Load Macro'),
            body: (
                <div className={styles.macroLoad}>
                    <p>{i18n._('Are you sure you want to load this macro?')}</p>
                    <p>{name}</p>
                </div>
            ),
            btnConfirm: {
                text: i18n._('Yes')
            },
            btnCancel: {
                text: i18n._('No')
            }
        }),
        loadMacro: async (id, { name }) => {
            try {
                let res;
                res = await api.macros.read(id);
                const { name } = res.body;
                controller.command('macro:load', id, controller.context, (err, data) => {
                    if (err) {
                        log.error(`Failed to load the macro: id=${id}, name="${name}"`);
                        return;
                    }

                    log.debug(data); // TODO
                });
            } catch (err) {
                // Ignore error
            }
        },
        openAddMacroModal: () => {
            this.actions.openModal(MODAL_ADD_MACRO);
        },
        openRunMacroModal: (id) => {
            api.macros.read(id)
                .then((res) => {
                    const { id, name, content } = res.body;
                    this.actions.openModal(MODAL_RUN_MACRO, { id, name, content });
                });
        },
        openEditMacroModal: (id) => {
            api.macros.read(id)
                .then((res) => {
                    const { id, name, content } = res.body;
                    this.actions.openModal(MODAL_EDIT_MACRO, { id, name, content });
                });
        }
    };
    controllerEvents = {
        'serialport:open': (options) => {
            const { port } = options;
            this.setState({ port: port });
        },
        'serialport:close': (options) => {
            this.setState({ port: '' });
        },
        'workflow:state': (workflowState) => {
            if (this.state.workflowState !== workflowState) {
                this.setState({ workflowState: workflowState });
            }
        }
    };

    componentDidMount() {
        this.addControllerEvents();

        // Fetch the list of macros
        this.actions.fetchMacros();
    }
    componentWillUnmount() {
        this.removeControllerEvents();
    }
    componentDidUpdate(prevProps, prevState) {
        const {
            minimized
        } = this.state;

        this.config.set('minimized', minimized);
    }
    getInitialState() {
        return {
            minimized: this.config.get('minimized', false),
            isFullscreen: false,
            port: controller.port,
            workflowState: controller.workflowState,
            modal: {
                name: MODAL_NONE,
                params: {}
            },
            macros: []
        };
    }
    addControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.on(eventName, callback);
        });
    }
    removeControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.off(eventName, callback);
        });
    }
    render() {
        const { widgetId } = this.props;
        const { minimized, isFullscreen } = this.state;
        const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);
        const state = {
            ...this.state
        };
        const actions = {
            ...this.actions
        };

        return (
            <Widget fullscreen={isFullscreen}>
                <Widget.Header>
                    <Widget.Title>
                        <Widget.Sortable className={this.props.sortable.handleClassName}>
                            <i className="fa fa-bars" />
                            <span className="space" />
                        </Widget.Sortable>
                        {isForkedWidget &&
                        <i className="fa fa-code-fork" style={{ marginRight: 5 }} />
                        }
                        {i18n._('Macro')}
                    </Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
                        <Widget.Button
                            title={i18n._('New Macro')}
                            onClick={actions.openAddMacroModal}
                        >
                            <i className="fa fa-plus" />
                        </Widget.Button>
                        <Widget.Button
                            disabled={isFullscreen}
                            title={minimized ? i18n._('Expand') : i18n._('Collapse')}
                            onClick={actions.toggleMinimized}
                        >
                            <i
                                className={classNames(
                                    'fa',
                                    { 'fa-chevron-up': !minimized },
                                    { 'fa-chevron-down': minimized }
                                )}
                            />
                        </Widget.Button>
                        <Widget.DropdownButton
                            title={i18n._('More')}
                            toggle={<i className="fa fa-ellipsis-v" />}
                            onSelect={(eventKey) => {
                                if (eventKey === 'fullscreen') {
                                    actions.toggleFullscreen();
                                } else if (eventKey === 'fork') {
                                    this.props.onFork();
                                } else if (eventKey === 'remove') {
                                    this.props.onRemove();
                                }
                            }}
                        >
                            <Widget.DropdownMenuItem eventKey="fullscreen">
                                <i
                                    className={classNames(
                                        'fa',
                                        'fa-fw',
                                        { 'fa-expand': !isFullscreen },
                                        { 'fa-compress': isFullscreen }
                                    )}
                                />
                                <span className="space space-sm" />
                                {!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem eventKey="fork">
                                <i className="fa fa-fw fa-code-fork" />
                                <span className="space space-sm" />
                                {i18n._('Fork Widget')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem eventKey="remove">
                                <i className="fa fa-fw fa-times" />
                                <span className="space space-sm" />
                                {i18n._('Remove Widget')}
                            </Widget.DropdownMenuItem>
                        </Widget.DropdownButton>
                    </Widget.Controls>
                </Widget.Header>
                <Widget.Content
                    className={classNames(
                        styles['widget-content'],
                        { [styles.hidden]: minimized }
                    )}
                >
                    {state.modal.name === MODAL_ADD_MACRO &&
                    <AddMacro state={state} actions={actions} />
                    }
                    {state.modal.name === MODAL_EDIT_MACRO &&
                    <EditMacro state={state} actions={actions} />
                    }
                    {state.modal.name === MODAL_RUN_MACRO &&
                    <RunMacro state={state} actions={actions} />
                    }
                    <Macro state={state} actions={actions} />
                </Widget.Content>
            </Widget>
        );
    }
}

export default MacroWidget;
