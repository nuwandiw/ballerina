import React from 'react';
import classnames from 'classnames';
import _ from 'lodash';
import PropTypes from 'prop-types';
import { Tab, Nav, NavItem } from 'react-bootstrap';
import ScrollBarsWithContextAPI from './../../view/scroll-bars/ScrollBarsWithContextAPI';
import ActivityBar from './ActivityBar';
import { HISTORY, COMMANDS } from './../constants';
import { createViewFromViewDef } from './utils';

const activityBarWidth = 42;
const panelTitleHeight = 36;

/**
 * Actions of the panel
 */
class PanelActions extends React.Component {

    /**
     * @inheritdoc
     */
    constructor(props, context) {
        super(props, context);
        this.updateActions = this.updateActions.bind(this);
    }

    /**
     * @inheritdoc
     */
    componentDidMount() {
        const { on } = this.context.command;
        on(COMMANDS.UPDATE_ALL_ACTION_TRIGGERS, this.updateActions);
    }

    /**
     * @inheritdoc
     */
    componentWillUnmount() {
        const { off } = this.context.command;
        off(COMMANDS.UPDATE_ALL_ACTION_TRIGGERS, this.updateActions);
    }

    /**
     * Update Actions
     */
    updateActions() {
        this.forceUpdate();
    }

    /**
     * @inheritdoc
     */
    render() {
        return (
            <div className="panel-actions">{
                this.props.actions.map(({ icon, isActive, handleAction, description }, index) => {
                    const isActionactive = _.isFunction(isActive) ? isActive() : true;
                    return (
                        <i
                            key={index}
                            className={classnames('fw', `fw-${icon}`, { active: isActionactive })}
                            onClick={() => {
                                if (isActionactive && _.isFunction(handleAction)) {
                                    handleAction();
                                }
                            }}
                            title={description}
                        />
                    );
                })
            }</div>
        );
    }
}

PanelActions.propTypes = {
    actions: PropTypes.arrayOf(Object),
};

PanelActions.defaultProps = {
    actions: [],
};

PanelActions.contextTypes = {
    command: PropTypes.shape({
        on: PropTypes.func,
        dispatch: PropTypes.func,
    }).isRequired,
};

/**
 * A Tab inside Left Panel
 */
class LeftPanelTab extends React.Component {

    /**
     * @inheritdoc
     */
    constructor(...args) {
        super(...args);
        this.scroller = undefined;
    }

    /**
     * @inheritdoc
     */
    shouldComponentUpdate(nextProps) {
        return nextProps.isActive;
    }

    /**
     * @inheritdoc
     */
    render() {
        const { viewDef, width, height, panelResizeInProgress,
                viewDef: {
                    regionOptions: {
                        panelTitle,
                        panelActions,
                    },
                },
            } = this.props;
        const dimensions = {
            width: width - activityBarWidth,
            height: height - panelTitleHeight,
        };
        const viewProps = {
            ...dimensions,
            panelResizeInProgress,
        };
        return (
            <div>
                <div>
                    <div className="panel-title">
                        {panelTitle}
                    </div>
                    <PanelActions actions={panelActions} />
                </div>
                <ScrollBarsWithContextAPI
                    style={dimensions}
                    className="panel-content-scroll-container"
                    ref={(ref) => {
                        this.scroller = ref;
                    }}
                    autoHide // Hide delay in ms
                    autoHideTimeout={1000}
                >
                    <div className="panel-content" style={{ width: width - activityBarWidth }}>
                        {
                            createViewFromViewDef(viewDef, viewProps)
                        }
                    </div>
                </ScrollBarsWithContextAPI>
            </div>
        );
    }

}

LeftPanelTab.propTypes = {
    viewDef: PropTypes.instanceOf(Object).isRequired,
    isActive: PropTypes.bool.isRequired,
    panelResizeInProgress: PropTypes.bool.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
};

/**
 * React component for LeftPanel Region.
 *
 * @class LeftPanel
 * @extends {React.Component}
 */
class LeftPanel extends React.Component {

    /**
     * @inheritdoc
     */
    render() {
        const tabs = [];
        const panes = [];
        const { views, onActiveViewChange, ...restProps } = this.props;
        const activeViewPrev = this.props.activeView
                    || this.context.history.get(HISTORY.ACTIVE_LEFT_PANEL_VIEW)
                    || views[0].id;
        views.forEach((viewDef) => {
            const {
                    id,
                    regionOptions: {
                        panelTitle,
                        activityBarIcon,
                    },
                  } = viewDef;
            tabs.push((
                <NavItem key={id} eventKey={id} title={panelTitle}>
                    <i className={`fw fw-${activityBarIcon} fw-lg`} />
                </NavItem>
            ));
            const propsForTab = {
                viewDef,
                ...restProps,
                isActive: this.props.show && activeViewPrev === id,
            };
            panes.push((
                <Tab.Pane key={id} eventKey={id}>
                    <LeftPanelTab {...propsForTab} />
                </Tab.Pane>
            ));
        });
        return (
            <div className="left-panel">
                <div>
                    <Tab.Container
                        id="activity-bar-tabs"
                        activeKey={this.props.show ? activeViewPrev : ''}
                        onSelect={(key) => {
                            const activeView = activeViewPrev !== key ? key : null;
                            // if same tab is selected, disable tabs
                            this.context.history.put(HISTORY.ACTIVE_LEFT_PANEL_VIEW, activeView);
                            onActiveViewChange(activeView);
                        }}
                    >
                        <div>
                            <ActivityBar>
                                <Nav bsStyle="tabs">
                                    {tabs}
                                </Nav>
                            </ActivityBar>
                            <Tab.Content animation>
                                {this.props.show && panes}
                            </Tab.Content>
                        </div>
                    </Tab.Container>
                </div>
            </div>
        );
    }
}

LeftPanel.propTypes = {
    show: PropTypes.bool.isRequired,
    onActiveViewChange: PropTypes.func.isRequired,
    views: PropTypes.arrayOf(Object).isRequired,
    panelResizeInProgress: PropTypes.bool.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    activeView: PropTypes.string,
};

LeftPanel.defaultProps = {
    activeView: undefined,
};

LeftPanel.contextTypes = {
    history: PropTypes.shape({
        put: PropTypes.func,
        get: PropTypes.func,
    }).isRequired,
    command: PropTypes.shape({
        on: PropTypes.func,
        dispatch: PropTypes.func,
    }).isRequired,
};

export default LeftPanel;
